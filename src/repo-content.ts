import * as core from "@actions/core";
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
  core.info(`[github] Fetching file content ${path}`);
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
  dir: string,
): Promise<Map<string, string>> {
  const prefix = dir.replace(/\/$/, ""); // drop any trailing slash
  const prefixRe = new RegExp(`^${prefix}/`); // strip including trailing slash

  core.info(`[github] Listing directory content ${prefix}`);
  const response = await client.rest.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.sha,
    path: prefix,
  });

  const paths = new Map();

  const entries = response.data as RepoPathEntry[];
  core.info(`Listed ${entries.length} entries`);

  await entries.forEach(async (entry: RepoPathEntry) => {
    if (entry.type === "file") {
      core.info(`Fetching file content for ${entry.path}`);
      // Return relative paths, mainly because that's more useful for us
      const content = await fetchRepoContent(client, entry.path);
      const name = entry.path.replace(prefixRe, "");
      core.info(`Setting ${name}`);
      paths.set(name, content);
    } else {
      core.warning(
        `Skipping non-file entry: ${entry.type}\n${JSON.stringify(entry)}`,
      );
    }
  });

  core.info(`Listed ${paths.size} file contents`);
  return paths;
}
