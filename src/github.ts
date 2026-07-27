export type PullRequestDetail = {
  number: number;
  author: string | null;
  labels: string[];
  changedFiles: PullRequestFile[];
};

export type PullRequestFile = {
  filename: string;
  patch: string; // may be empty
};

export async function fetchPullRequestDetail(
  gh: GitHub,
  number: number,
): Promise<PullRequestDetail> {
  const pr = await gh.getPullRequest(number);
  const prFiles = await gh.listPullRequestFiles(number);
  const files = prFiles.map((file) => {
    return {
      filename: file.filename,
      patch: file.patch ?? "",
    };
  });

  return {
    number: pr.number,
    author: pr.user?.login ?? null,
    labels: pr.labels.map((label) => label.name),
    changedFiles: files,
  };
}

export async function createIssueComment(
  gh: GitHub,
  number: number,
  body: string,
): Promise<void> {
  gh.createIssueComment(number, body);
}

export async function fetchRepoContent(
  gh: GitHub,
  ref: string,
  path: string,
): Promise<string> {
  const file = await gh.getFile(ref, path);
  return Buffer.from(file.content, file.encoding).toString();
}

export async function listRepoContent(
  gh: GitHub,
  ref: string,
  dir: string,
): Promise<Map<string, string>> {
  const prefix = dir.replace(/\/$/, ""); // drop any trailing slash
  const prefixRe = new RegExp(`^${prefix}/`); // strip including trailing slash

  const paths = new Map();
  const entries = await gh.listDirectory(ref, prefix);

  await Promise.all(
    entries.map(async (entry: GitHubEntry) => {
      if (entry.type !== "file") {
        return;
      }

      // Return relative paths, mainly because that's more useful for us
      const name = entry.path.replace(prefixRe, "");
      const content = await fetchRepoContent(gh, ref, entry.path);
      paths.set(name, content);
    }),
  );

  return paths;
}

export type ClientType = ReturnType<typeof gh.getOctokit>;

export type GitHubUser = {
  login: string;
};

export type GitHubLabel = {
  name: string;
};

export type GitHubPullRequest = {
  number: number;
  user: GitHubUser | null | undefined;
  labels: GitHubLabel[];
};

export type GitHubPullRequestFile = {
  filename: string;
  patch: string | null | undefined;
};

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
  getPullRequest: (number: number) => Promise<GitHubPullRequest>;
  listPullRequestFiles: (number: number) => Promise<GitHubPullRequestFile[]>;
  createIssueComment: (number: number, body: string) => Promise<void>;
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

  async getPullRequest(number: number): Promise<GitHubPullRequest> {
    const response = await this.client.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: number,
    });

    return response.data;
  }

  async listPullRequestFiles(number: number): Promise<GitHubPullRequestFile[]> {
    const options = this.client.rest.pulls.listFiles.endpoint.merge({
      owner: this.owner,
      repo: this.repo,
      pull_number: number,
    });

    return await this.client.paginate(options);
  }

  async createIssueComment(number: number, body: string): Promise<void> {
    await this.client.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: number,
      body,
    });
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

  async getPullRequest(_number: number): Promise<GitHubPullRequest> {
    throw new Error("Unimplemented");
  }

  async listPullRequestFiles(
    _number: number,
  ): Promise<GitHubPullRequestFile[]> {
    throw new Error("Unimplemented");
  }

  async createIssueComment(_number: number, _body: string): Promise<void> {
    throw new Error("Unimplemented");
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
