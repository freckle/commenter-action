import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";
import { Minimatch } from "minimatch";
import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";

import { ConfigurationWhereClause } from "./where";
import * as where from "./where";
import { getChanges } from "./changes";

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
      if (where.matches(changes, config.where)) {
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

async function addComment(client: ClientType, body: string): Promise<void> {
  await client.rest.issues.createComment({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: github.context.issue.number,
    body,
  });
}

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
