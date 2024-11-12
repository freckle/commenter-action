import * as github from "@actions/github";

type ClientType = ReturnType<typeof github.getOctokit>;

type RepoPath = {
  content: string;
  encoding: BufferEncoding;
};

export async function fetchRepoContent(
  client: ClientType,
  path: string,
): Promise<string> {
  const response = await client.rest.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.sha,
    path,
  });

  const repoPath = response.data as RepoPath;
  return Buffer.from(repoPath.content, repoPath.encoding).toString();
}
