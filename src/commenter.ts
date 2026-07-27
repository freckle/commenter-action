import * as core from "@actions/core";
import * as github from "@actions/github";

import { type Changes, getChanges } from "./changes.js";
import { type Configuration, getConfigurations } from "./configuration.js";
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

    const configs = await getConfigurations(client, configPath, bodyFilePrefix);
    const changes = await getChanges(client);

    configs.forEach((config) => {
      core.info(`${config.name} => ${JSON.stringify(config.where)}`);
    });

    core.info(`change author: ${changes.author}`);
    core.info(`change labels: ${changes.labels.join(", ")}`);

    changes.changedFiles.forEach((file) => {
      core.info(`changed file: ${file.filename}`);
    });

    const bodies = getMatchingBodies(configs, changes);
    core.info(`Found ${bodies.length} matching stanza(s)`);

    addCommentBodies(client, onMultiMatch, bodies);
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

function getMatchingBodies(
  configs: Configuration[],
  changes: Changes,
): string[] {
  const bodies: string[] = [];

  configs.forEach((config) => {
    core.debug(`Checking ${config.name}...`);

    if (where.matches(changes, config.where)) {
      core.debug("matched");
      bodies.push(config.body);
    }
  });

  return bodies;
}

async function addCommentBodies(
  client: ClientType,
  onMultiMatch: string,
  bodies: string[],
): Promise<void> {
  const addComments = async (bodies: string[]): Promise<void> => {
    await Promise.all(
      bodies.map(async (body) => {
        await client.rest.issues.createComment({
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          issue_number: github.context.issue.number,
          body,
        });
      }),
    );
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
}
