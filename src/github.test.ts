import { MockGitHub } from "./github.js";
import * as github from "./github.js";

describe("fetchRepoContent", () => {
  it("fetches a file's content as string", async () => {
    const gh = new MockGitHub(
      new Map([
        ["README.md", "Readme content\n"],
        ["other.txt", "other content\n"],
      ]),
    );

    const content = await github.fetchRepoContent(gh, "ref", "README.md");

    expect(content).toEqual("Readme content\n");
  });
});

describe("listRepoContent", () => {
  it("lists file entries", async () => {
    const gh = new MockGitHub(
      new Map([
        ["README.md", "Readme content\n"],
        ["dir/this.txt", "this content\n"],
        ["dir/that.txt", "that content\n"],
        ["dir/sub/other.txt", "other content\n"],
      ]),
    );

    const paths = await github.listRepoContent(gh, "ref", "dir/");

    expect(paths.size).toEqual(2);
    expect(paths.get("this.txt")).toEqual("this content\n");
    expect(paths.get("that.txt")).toEqual("that content\n");
  });
});
