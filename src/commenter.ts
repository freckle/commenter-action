import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";
import { Minimatch } from "minimatch";
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";

type ClientType = ReturnType<typeof github.getOctokit>;
type ListFilesResponse =
  RestEndpointMethodTypes["pulls"]["listFiles"]["response"]["data"];

export async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const configPath = core.getInput("configuration-path", { required: true });
    const bodyFilePrefix = core.getInput("body-file-prefix", {
      required: true,
    });

    const client: ClientType = github.getOctokit(token);
    const configs = await getConfigurations(client, configPath);
    const changes = await getChanges(client);

    let body: string | null = null;

    for (const [name, config] of Object.entries(configs)) {
      if (matches(changes, config.where)) {
        if (config.body) {
          body = config.body;
        } else {
          const bodyFileName = config["body-file-name"] ?? `${name}.md`;
          const bodyFile =
            config["body-file"] ?? `${bodyFilePrefix}${bodyFileName}`;
          body = await fetchContent(client, bodyFile);
        }
        break; // first match wins
      }
    }

    if (body) {
      addComment(client, body);
    }
  } catch (error) {
    // Refine unknown type
    if (error instanceof Error) {
      core.error(error);
      core.setFailed(error.message);
    } else if (typeof error === "string") {
      core.error(error);
      core.setFailed(error);
    } else {
      core.error("Non-Error exception");
      core.setFailed("Non-Error exception");
    }
  }
}

type ChangedFile = { filename: string; patch: string };

async function getChanges(client: ClientType): Promise<Changes> {
  const { data: pullRequest } = await client.rest.pulls.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.issue.number,
  });

  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.issue.number,
  });

  const listFilesResponse: ListFilesResponse =
    await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map((f) => ({
    filename: f.filename,
    patch: f.patch ?? "",
  }));

  core.debug("found changed files:");
  for (const file of changedFiles) {
    core.debug(" file: " + file.filename);
    core.debug(" patch (first 100): " + file.patch.slice(0, 100));
  }

  return {
    changedFiles,
    author: pullRequest.user?.login,
    labels: pullRequest.labels.map((label) => label.name),
  };
}

async function addComment(client: ClientType, body: string): Promise<void> {
  await client.rest.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: github.context.issue.number,
    body,
  });
}

type ConfigurationWhereClause = {
  path: {
    matches: string;
  };
  additions_or_deletions?: {
    contain: string[];
  };
  author?: {
    any: string[];
  };
  labels?: {
    any: string[];
  };
};

type Configuration = {
  body: string | undefined;
  "body-file": string | undefined;
  "body-file-name": string | undefined;
  where: ConfigurationWhereClause;
};

async function getConfigurations(
  client: ClientType,
  configurationPath: string,
): Promise<Map<string, Configuration>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath,
  );

  const configObject: any = yaml.load(configurationContent);
  return configObject;
}

async function fetchContent(client: ClientType, path: string): Promise<string> {
  const response: any = await client.rest.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.sha,
    path,
  });

  return Buffer.from(response.data.content, response.data.encoding).toString();
}

type Changes = {
  changedFiles: ChangedFile[];
  author?: string;
  labels: string[];
};

function matches(changes: Changes, where: ConfigurationWhereClause): boolean {
  const { changedFiles, author, labels } = changes;
  const matcher = new Minimatch(where.path.matches);

  const hasFileMatch = changedFiles.some(
    ({ filename, patch }) =>
      matcher.match(filename) &&
      (!where.additions_or_deletions ||
        patchContains(patch, where.additions_or_deletions.contain)),
  );

  const hasAuthorMatch =
    !where.author ||
    (author !== undefined && where.author.any.includes(author));

  const hasLabelMatch =
    !where.labels || labels.some((label) => where.labels?.any.includes(label));

  return hasFileMatch && hasAuthorMatch && hasLabelMatch;
}

const patchContains = (patch: string, needles: string[]) =>
  needles.some((needle) => patch.includes(needle));
