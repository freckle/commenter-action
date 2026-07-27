import { run } from "./commenter.js";
import { MockGitHub } from "./github.js";

describe("run", () => {
  it("runs with a basic configuration", async () => {
    const gh = new MockGitHub();

    gh.pullRequests.set(42, {
      number: 42,
      author: "pbrisbin",
      labels: [],
      changedFiles: [
        {
          filename: "README.md",
          patch: "",
        },
      ],
    });

    gh.contents.set(
      ".github/commenter.yml",
      [
        "README:",
        "  where:",
        "    path:",
        "      matches: README.md",
        "  body: |",
        "    Comment body",
        "",
      ].join("\n"),
    );

    const inputs = {
      token: "",
      configurationPath: ".github/commenter.yml",
      bodyFilePrefix: ".github/commenter/",
      onMultiMatch: "first",
    };

    await run(gh, inputs, "ref", 42);

    expect(gh.commentsLeft).toEqual(["Comment body\n"]);
  });
});
