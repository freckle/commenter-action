import * as core from "@actions/core";
import * as github from "@actions/github";

import * as commenter from "./commenter.js";
import { RealGitHub } from "./github.js";
import { getInputs } from "./inputs.js";

async function run() {
  try {
    const inputs = getInputs();
    const client = github.getOctokit(inputs.token);
    const gh = new RealGitHub(
      client,
      github.context.repo.owner,
      github.context.repo.repo,
    );

    await commenter.run(
      gh,
      inputs,
      github.context.sha,
      github.context.issue.number,
    );
  } catch (error) {
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

run();
