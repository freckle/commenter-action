import { getConfigurations } from "./configuration.js";
import { MockGitHub } from "./github.js";

describe("getConfigurations", () => {
  it("loads a basic configuration", async () => {
    const gh = new MockGitHub(
      new Map([
        [
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
        ],
      ]),
    );

    const config = await getConfigurations(
      gh,
      "ref",
      ".github/commenter.yml",
      ".github/commenter/",
    );

    expect(config).toEqual([
      {
        name: "README",
        where: { path: { matches: "README.md" } },
        body: "Comment body\n",
      },
    ]);
  });

  it("loads an implicit body-file", async () => {
    const gh = new MockGitHub(
      new Map([
        [
          ".github/commenter.yml",
          [
            "README:",
            "  where:",
            "    path:",
            "      matches: README.md",
            "",
          ].join("\n"),
        ],
        [".github/commenter/README.md", "Comment body\n"],
      ]),
    );

    const config = await getConfigurations(
      gh,
      "ref",
      ".github/commenter.yml",
      ".github/commenter/",
    );

    expect(config).toEqual([
      {
        name: "README",
        where: { path: { matches: "README.md" } },
        body: "Comment body\n",
      },
    ]);
  });
});
