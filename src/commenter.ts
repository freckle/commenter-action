import * as core from "@actions/core";

import { getConfigurations } from "./configuration.js";
import { Inputs } from "./inputs.js";
import { GitHub } from "./github.js";
import * as github from "./github.js";
import * as where from "./where.js";

export async function run(
  gh: GitHub,
  inputs: Inputs,
  ref: string,
  prNumber: number,
) {
  const { configurationPath, bodyFilePrefix, onMultiMatch } = inputs;

  const pr = await github.fetchPullRequestDetail(gh, prNumber);
  const bodyFiles = await github.listRepoContent(gh, ref, bodyFilePrefix);
  const config = await github.fetchRepoContent(gh, ref, configurationPath);
  const configs = await getConfigurations(gh, ref, config, bodyFiles);

  const ps: Promise<void>[] = configs.map((config) => {
    return where.matches(pr, config.where)
      ? github.createIssueComment(gh, pr.number, config.body)
      : Promise.resolve();
  });

  if (ps.length > 0) {
    switch (onMultiMatch) {
      case "all":
        await Promise.all(ps);
        break;
      case "first":
        await Promise.all(ps.slice(0, 1));
        break;
      case "last":
        await Promise.all(ps.slice(-1));
        break;
      default:
        core.warning(
          `Invalid on-multi-match (${onMultiMatch}), must be all|first|last.`,
        );
        await Promise.all(ps.slice(0, 1));
    }
  }
}
