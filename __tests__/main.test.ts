import { run } from "../src/commenter";
import * as github from "@actions/github";

const fs = jest.requireActual("fs");

jest.mock("@actions/core");
jest.mock("@actions/github");

const gh = github.getOctokit("_");
const createCommentMock = jest.spyOn(gh.rest.issues, "createComment");
const reposMock = jest.spyOn(gh.rest.repos, "getContent");
const paginateMock = jest.spyOn(gh, "paginate");

const yamlFixtures = {
  "only_pdfs.yml": fs.readFileSync("__tests__/fixtures/only_pdfs.yml"),
  "patch_contains.yml": fs.readFileSync(
    "__tests__/fixtures/patch_contains.yml"
  ),
};

afterAll(() => jest.restoreAllMocks());

describe("run", () => {
  it("adds comments to PRs that match our glob patterns", async () => {
    usingConfigYaml("only_pdfs.yml");
    mockGitHubResponseChangedFiles("foo.pdf");

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

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });

  it("adds comments to PRs that match our glob patterns and patch contents", async () => {
    usingConfigYaml("patch_contains.yml");
    mockGitHubResponseChangedFiles([
      "script_using_truncate.sql",
      patchContaining("TRUNCATE"),
    ]);

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

    await run();

    expect(createCommentMock).toHaveBeenCalledTimes(0);
  });

  it("does not comment on PRs that match patch contents but not our glob patterns", async () => {
    usingConfigYaml("patch_contains.yml");
    mockGitHubResponseChangedFiles([
      "sql_commands.txt",
      patchContaining("TRUNCATE"),
    ]);

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
