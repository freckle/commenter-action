import * as core from "@actions/core";

import { Configuration, getConfigurations } from "./configuration.js";
import { GitHub, PullRequestDetail } from "./github.js";
import * as github from "./github.js";
import * as where from "./where.js";

export async function run(gh: GitHub, ref: string, prNumber: number) {
  try {
    // const token = core.getInput("repo-token", { required: true });
    const configPath = core.getInput("configuration-path", { required: true });
    const bodyFilePrefix = core.getInput("body-file-prefix", {
      required: true,
    });
    const onMultiMatch = core.getInput("on-multi-match", { required: true });

    const pr = await github.fetchPullRequestDetail(gh, prNumber);
    const configs = await getConfigurations(
      gh,
      ref,
      configPath,
      bodyFilePrefix,
    );
    const bodies = getMatchingBodies(configs, pr);
    addCommentBodies(gh, pr.number, onMultiMatch, bodies);
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
  changes: PullRequestDetail,
): string[] {
  const bodies: string[] = [];

  configs.forEach((config) => {
    if (where.matches(changes, config.where)) {
      bodies.push(config.body);
    }
  });

  return bodies;
}

async function addCommentBodies(
  gh: GitHub,
  prNumber: number,
  onMultiMatch: string,
  bodies: string[],
): Promise<void> {
  const addComments = async (bodies: string[]): Promise<void> => {
    await Promise.all(
      bodies.map(async (body) => {
        await github.createIssueComment(gh, prNumber, body);
      }),
    );
  };

  if (bodies.length > 0) {
    switch (onMultiMatch) {
      case "all":
        core.info(`Adding all ${bodies.length} matching comment(s)`);
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
