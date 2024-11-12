import * as core from "@actions/core";
import * as github from "@actions/github";

import { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";

type ClientType = ReturnType<typeof github.getOctokit>;
type ListFilesResponse =
  RestEndpointMethodTypes["pulls"]["listFiles"]["response"]["data"];

export type Changes = {
  changedFiles: ChangedFile[];
  author?: string;
  labels: string[];
};

export type ChangedFile = { filename: string; patch: string };

export async function getChanges(client: ClientType): Promise<Changes> {
  const { data: pullRequest } = await client.rest.pulls.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.issue.number,
  });

  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.issue.number,
  });

  const listFilesResponse: ListFilesResponse =
    await client.paginate(listFilesOptions);
  const changedFiles = listFilesResponse.map((f) => ({
    filename: f.filename,
    patch: f.patch ?? "",
  }));

  core.debug("found changed files:");
  for (const file of changedFiles) {
    core.debug(" file: " + file.filename);
    core.debug(" patch (first 100): " + file.patch.slice(0, 100));
  }

  return {
    changedFiles,
    author: pullRequest.user?.login,
    labels: pullRequest.labels.map((label) => label.name),
  };
}
