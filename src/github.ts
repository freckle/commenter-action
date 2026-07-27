import * as gh from "@actions/github";

export async function fetchRepoContent(
  github: GitHub,
  ref: string,
  path: string,
): Promise<string> {
  const file = await github.getFile(ref, path);
  return Buffer.from(file.content, file.encoding).toString();
}

export async function listRepoContent(
  github: GitHub,
  ref: string,
  dir: string,
): Promise<Map<string, string>> {
  const prefix = dir.replace(/\/$/, ""); // drop any trailing slash
  const prefixRe = new RegExp(`^${prefix}/`); // strip including trailing slash

  const paths = new Map();
  const entries = await github.listDirectory(ref, prefix);

  await Promise.all(
    entries.map(async (entry: GitHubEntry) => {
      if (entry.type !== "file") {
        return;
      }

      // Return relative paths, mainly because that's more useful for us
      const name = entry.path.replace(prefixRe, "");
      const content = await fetchRepoContent(github, ref, entry.path);
      paths.set(name, content);
    }),
  );

  return paths;
}

export type ClientType = ReturnType<typeof gh.getOctokit>;

export type GitHubEntry = {
  type: string;
  path: string;
};

export type GitHubFile = {
  type: "file";
  content: string;
  encoding: BufferEncoding;
};

export interface GitHub {
  getFile: (ref: string, path: string) => Promise<GitHubFile>;
  listDirectory: (ref: string, path: string) => Promise<GitHubEntry[]>;
}

export class RealGitHub {
  private client: ClientType;
  private owner: string;
  private repo: string;

  constructor(client: ClientType, owner: string, repo: string) {
    this.client = client;
    this.owner = owner;
    this.repo = repo;
  }

  async getFile(ref: string, path: string): Promise<GitHubFile> {
    const response = await this.client.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      ref,
      path,
    });

    return response.data as GitHubFile;
  }

  async listDirectory(ref: string, path: string): Promise<GitHubEntry[]> {
    const response = await this.client.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      ref,
      path,
    });

    return response.data as GitHubEntry[];
  }
}

export class MockGitHub {
  private contents: Map<string, string>;

  constructor(contents?: Map<string, string>) {
    this.contents = contents ?? new Map();
  }

  async getFile(ref: string, path: string): Promise<GitHubFile> {
    const content = this.contents.get(path);

    if (!content) {
      throw new Error(`getFile called with ${path}, which is not known`);
    }

    return {
      type: "file",
      content,
      encoding: "utf8",
    };
  }

  async listDirectory(ref: string, path: string): Promise<GitHubEntry[]> {
    const entries: GitHubEntry[] = [];

    for (const key of this.contents.keys()) {
      if (key.startsWith(`${path}/`)) {
        const rel = key.replace(new RegExp(`^${path}/`), "");
        const relDir = rel.replace(new RegExp(`^([^/]+)/.*`), "$1");

        if (relDir !== rel) {
          entries.push({ type: "dir", path: `${path}/${relDir}` });
        } else {
          entries.push({ type: "file", path: key });
        }
      }
    }

    return entries;
  }
}
