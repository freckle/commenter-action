import * as core from "@actions/core";

import { Configuration, getConfigurations } from "./configuration.js";
import { Inputs, getInputs } from "./inputs.js";
import { GitHub, PullRequestDetail } from "./github.js";
import * as github from "./github.js";
import * as where from "./where.js";

export async function run(
  gh: GitHub,
  inputs: Inputs,
  ref: string,
  prNumber: number,
) {
  const pr = await github.fetchPullRequestDetail(gh, prNumber);
  const configs = await getConfigurations(
    gh,
    ref,
    inputs.configurationPath,
    inputs.bodyFilePrefix,
  );
  const bodies = getMatchingBodies(configs, pr);
  addCommentBodies(gh, pr.number, inputs.onMultiMatch, bodies);
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
        return await addComments(bodies);
      case "first":
        return await addComments(bodies.slice(0, 1));
      case "last":
        return await addComments(bodies.slice(-1));
      default:
        core.warning(
          `Invalid on-multi-match (${onMultiMatch}), must be all|first|last.`,
        );
        await addComments(bodies.slice(0, 1));
    }
  }
}
