import * as core from "@actions/core";
import * as github from "@actions/github";

import { getChanges } from "./changes.js";
import { getConfigurations, getCommentBody } from "./configuration.js";
import * as where from "./where.js";

type ClientType = ReturnType<typeof github.getOctokit>;

export async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const configPath = core.getInput("configuration-path", { required: true });
    const bodyFilePrefix = core.getInput("body-file-prefix", {
      required: true,
    });
    const onMultiMatch = core.getInput("on-multi-match", { required: true });

    const client: ClientType = github.getOctokit(token);
    const configs = await getConfigurations(client, configPath);
    const changes = await getChanges(client);

    core.debug(`changes: ${JSON.stringify(changes)}`);

    const bodies: string[] = [];

    for (const [name, config] of Object.entries(configs)) {
      core.info(`${name} => ${JSON.stringify(config)}`);

      if (where.matches(changes, config.where)) {
        core.info("matched");
        const body = await getCommentBody(client, bodyFilePrefix, name, config);
        bodies.push(body);
      }
    }

    core.info(`Found ${bodies.length} matching stanzas`);

    const addComments = async (bodies: string[]): Promise<void> => {
      await bodies.forEach(async (body) => {
        await addComment(client, body);
      });
    };

    if (bodies.length > 0) {
      switch (onMultiMatch) {
        case "all":
          core.info(`Adding ${bodies.length} matching comment(s)`);
          await addComments(bodies);
          break;
        case "first":
          core.info(`Adding first of ${bodies.length} matching comment(s)`);
          await addComments(bodies.slice(0, 1));
          break;
        case "last":
          core.info(`Adding last of ${bodies.length} matching comment(s)`);
          await addComments(bodies.slice(-1));
          break;
        default:
          core.warning(
            `Invalid on-multi-match (${onMultiMatch}), must be all|first|last.`,
          );
          core.info(`Adding first of ${bodies.length} matching comment(s)`);
          await addComments(bodies.slice(0, 1));
      }
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
