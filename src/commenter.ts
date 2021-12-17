import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";
import { Minimatch } from "minimatch";

type ClientType = ReturnType<typeof github.getOctokit>;

export async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const configPath = core.getInput("configuration-path", { required: true });

    const client: ClientType = github.getOctokit(token);
    const configs = await getConfigurations(client, configPath);
    const changedFiles: ChangedFile[] = await getChangedFiles(client);

    let body: string | null = null;

    for (const [_name, config] of Object.entries(configs)) {
      if (matches(changedFiles, config)) {
        body = config.body;
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

async function getChangedFiles(client: ClientType): Promise<ChangedFile[]> {
  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.issue.number,
  });

  const listFilesResponse = await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map((f: any) => ({
    filename: f.filename,
    patch: f.patch,
  }));

  core.debug("found changed files:");
  for (const file of changedFiles) {
    core.debug(" file: " + file.filename);
    core.debug(" patch (first 100): " + file.patch.slice(0, 100));
  }

  return changedFiles;
}

async function addComment(client: ClientType, body: string): Promise<void> {
  await client.rest.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: github.context.issue.number,
    body,
  });
}

// For now, since there's only 1 type of `where` match we can do, the object is
// all-or-nothing.
type ConfigurationWhereClause = {
  patch: {
    additions_or_deletions: {
      contain: string[];
    };
  };
};

type Configuration = {
  paths: string[];
  body: string;
  where?: ConfigurationWhereClause;
};

async function getConfigurations(
  client: ClientType,
  configurationPath: string
): Promise<Map<string, Configuration>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
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

function matches(changedFiles: ChangedFile[], config: Configuration): boolean {
  const matchers = config.paths.map((g) => new Minimatch(g));

  for (const changedFile of changedFiles) {
    for (const matcher of matchers) {
      if (
        matcher.match(changedFile.filename) &&
        (!config.where || whereIsMet(changedFile.patch, config.where))
      ) {
        return true;
      }
    }
  }

  return false;
}

const whereIsMet = (patch: string, where: ConfigurationWhereClause) =>
  where.patch.additions_or_deletions.contain.some((needle) =>
    patch.includes(needle)
  );
