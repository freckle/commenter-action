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
    const changedFiles: string[] = await getChangedFiles(client);

    let body: string | null = null;

    for (const [_name, config] of Object.entries(configs)) {
      if (matchAny(changedFiles, config.paths)) {
        body = config.body;
        break; // first match wins
      }
    }

    if (body) {
      addComment(client, body);
    }
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

async function getChangedFiles(client: ClientType): Promise<string[]> {
  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.issue.number,
  });

  const listFilesResponse = await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map((f: any) => f.filename);

  core.debug("found changed files:");
  for (const file of changedFiles) {
    core.debug("  " + file);
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

type Configuration = {
  paths: string[];
  body: string;
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

function matchAny(changedFiles: string[], globs: string[]): boolean {
  const matchers = globs.map((g) => new Minimatch(g));

  for (const changedFile of changedFiles) {
    for (const matcher of matchers) {
      if (matcher.match(changedFile)) {
        return true;
      }
    }
  }

  return false;
}
