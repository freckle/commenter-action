import { run } from "../src/commenter";
import * as github from "@actions/github";

const fs = jest.requireActual("fs");

jest.mock("@actions/core");
jest.mock("@actions/github");

const gh = github.getOctokit("_");
const createCommentMock = jest.spyOn(gh.rest.issues, "createComment");
const reposMock = jest.spyOn(gh.rest.repos, "getContent");
const paginateMock = jest.spyOn(gh, "paginate");
const getPullMock = jest.spyOn(gh.rest.pulls, "get");

const yamlFixtures = {
  "only_pdfs.yml": fs.readFileSync("__tests__/fixtures/only_pdfs.yml"),
  "patch_contains.yml": fs.readFileSync(
    "__tests__/fixtures/patch_contains.yml",
  ),
  "authors.yml": fs.readFileSync("__tests__/fixtures/authors.yml"),
  "labels.yml": fs.readFileSync("__tests__/fixtures/labels.yml"),
};

afterAll(() => jest.restoreAllMocks());

describe("run", () => {
  it("adds comments to PRs that match our glob patterns", async () => {
    usingConfigYaml("only_pdfs.yml");
    mockGitHubResponseChangedFiles("foo.pdf");
    mockGitHubResponsePrGet();

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(1);
    expect(createCommentMock).toHaveBeenCalledWith({
      owner: "monalisa",
      repo: "helloworld",
      issue_number: 123,
      body: "The comment body\n",
    });
  });

  it("does not comment on PRs that do not match our glob patterns", async () => {
    usingConfigYaml("only_pdfs.yml");
    mockGitHubResponseChangedFiles("foo.txt");
    mockGitHubResponsePrGet();

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });

  it("adds comments to PRs that match our glob patterns and patch contents", async () => {
    usingConfigYaml("patch_contains.yml");
    mockGitHubResponseChangedFiles([
      "script_using_truncate.sql",
      patchContaining("TRUNCATE"),
    ]);
    mockGitHubResponsePrGet();

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(1);
    expect(createCommentMock).toHaveBeenCalledWith({
      owner: "monalisa",
      repo: "helloworld",
      issue_number: 123,
      body: "Looks like you changed a TRUNCATE line...\n",
    });
  });

  it("does not comment on PRs that match our glob patterns but not patch contents", async () => {
    usingConfigYaml("patch_contains.yml");
    mockGitHubResponseChangedFiles([
      "script_not_using_truncate.sql",
      patchContaining("SELECT"),
    ]);
    mockGitHubResponsePrGet();

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });

  it("does not comment on PRs that match patch contents but not our glob patterns", async () => {
    usingConfigYaml("patch_contains.yml");
    mockGitHubResponseChangedFiles([
      "sql_commands.txt",
      patchContaining("TRUNCATE"),
    ]);
    mockGitHubResponsePrGet();

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });

  it("adds comments to PRs that match glob patterns and author", async () => {
    usingConfigYaml("authors.yml");
    mockGitHubResponseChangedFiles("foo.sql");
    mockGitHubResponsePrGet({ author: "bot" });

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(1);
    expect(createCommentMock).toHaveBeenCalledWith({
      owner: "monalisa",
      repo: "helloworld",
      issue_number: 123,
      body: "This change requires human review\n",
    });
  });

  it("does not comment on PRs that match glob patterns from different author", async () => {
    usingConfigYaml("authors.yml");
    mockGitHubResponseChangedFiles("foo.sql");
    mockGitHubResponsePrGet({ author: "different-author" });

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });

  it("does not comment on PRs that match the author but not glob patterns", async () => {
    usingConfigYaml("authors.yml");
    mockGitHubResponseChangedFiles("foo.txt");
    mockGitHubResponsePrGet({ author: "bot" });

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });

  it("adds comments to PRs that match glob patterns and labels", async () => {
    usingConfigYaml("labels.yml");
    mockGitHubResponseChangedFiles("foo.js");
    mockGitHubResponsePrGet({ labels: ["JavaScript", "React"] });

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(1);
    expect(createCommentMock).toHaveBeenCalledWith({
      owner: "monalisa",
      repo: "helloworld",
      issue_number: 123,
      body: "Remember to update your mocks!\n",
    });
  });

  it("does not comment on PRs that match glob patterns but lack labels", async () => {
    usingConfigYaml("labels.yml");
    mockGitHubResponseChangedFiles("foo.js");
    mockGitHubResponsePrGet({ labels: [] });

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });

  it("does not comment on PRs that are labeled without matching glob patterns", async () => {
    usingConfigYaml("labels.yml");
    mockGitHubResponseChangedFiles("foo.txt");
    mockGitHubResponsePrGet({ labels: ["Frontend"] });

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });
});

function usingConfigYaml(fixtureName: keyof typeof yamlFixtures): void {
  reposMock.mockResolvedValue(<any>{
    data: { content: yamlFixtures[fixtureName], encoding: "utf8" },
  });
}

type FileNameOrWithPatch = string | [string, string];

const patchContaining = (t) =>
  `@@ -132,7 +132,7 @@ module Test @@ -1000,7 +1000,7 @@ ${t}`;

function mockGitHubResponseChangedFiles(...files: FileNameOrWithPatch[]): void {
  const returnValue = files.map((f) => ({
    filename: typeof f === "string" ? f : f[0],
    patch: typeof f === "string" ? patchContaining("some changed line") : f[1],
  }));
  paginateMock.mockReturnValue(<any>returnValue);
}

type MockedPrDetails = {
  author?: string;
  labels?: string[];
};

function mockGitHubResponsePrGet(details?: MockedPrDetails): void {
  const labels =
    details?.labels?.map((name) => ({ id: "X", name, default: false })) || [];

  getPullMock.mockResolvedValue(<any>{
    data: { user: { login: details?.author }, labels },
  });
}
