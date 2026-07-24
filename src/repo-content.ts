import * as github from "@actions/github";

type ClientType = ReturnType<typeof github.getOctokit>;

type RepoPath = {
  type: "file";
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

type RepoPathEntry = {
  type: string;
  path: string;
};

export async function listRepoContent(
  client: ClientType,
  prefix: string,
): Promise<Map<string, string>> {
  const response = await client.rest.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.sha,
    path: prefix,
  });

  const paths = new Map();

  const entries = response.data as RepoPathEntry[];
  await entries.forEach(async (entry: RepoPathEntry) => {
    if (entry.type === "file") {
      const content = await fetchRepoContent(client, entry.path);
      paths.set(entry.path, content);
    }
  });

  return paths;
}
