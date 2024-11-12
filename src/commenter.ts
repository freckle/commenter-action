import * as core from "@actions/core";
import * as github from "@actions/github";

import { getChanges } from "./changes";
import { getConfigurations, getCommentBody } from "./configuration";
import * as where from "./where";

type ClientType = ReturnType<typeof github.getOctokit>;

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
        body = await getCommentBody(client, bodyFilePrefix, name, config);
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
