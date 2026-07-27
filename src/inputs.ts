import * as core from "@actions/core";

export type Inputs = {
  token: string;
  configurationPath: string;
  bodyFilePrefix: string;
  onMultiMatch: string;
};

export function getInputs(): Inputs {
  return {
    token: core.getInput("repo-token", { required: true }),
    configurationPath: core.getInput("configuration-path", { required: true }),
    bodyFilePrefix: core.getInput("body-file-prefix", { required: true }),
    onMultiMatch: core.getInput("on-multi-match", { required: true }),
  };
}
