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
});

function usingConfigYaml(fixtureName: keyof typeof yamlFixtures): void {
  reposMock.mockResolvedValue(<any>{
    data: { content: yamlFixtures[fixtureName], encoding: "utf8" },
  });
}

function mockGitHubResponseChangedFiles(...files: string[]): void {
  const returnValue = files.map((f) => ({ filename: f }));
  paginateMock.mockReturnValue(<any>returnValue);
}
