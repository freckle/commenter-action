import * as github from "@actions/github";

type ClientType = ReturnType<typeof github.getOctokit>;

export async function fetchRepoContent(
  client: ClientType,
  path: string,
): Promise<string> {
  const response: any = await client.rest.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.sha,
    path,
  });

  return Buffer.from(response.data.content, response.data.encoding).toString();
}
