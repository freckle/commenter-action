/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi } from "vitest";
import * as github from "@actions/github";

import {
  type ConfigurationYaml,
  loadConfigationYaml,
  getConfigurations,
} from "./configuration.js";

vi.mock("@actions/core");
vi.mock("@actions/github");

const gh = github.getOctokit("_");
const reposMock = vi.spyOn(gh.rest.repos, "getContent");

describe("ConfigurationYaml", () => {
  it("parses in a Map", () => {
    const yaml = [
      "Example:",
      "  where:",
      "    path:",
      '      matches: ".github/test/commenter.yml"',
      "  body: |",
      "    **This commented is added by integration tests**",
      "",
      "    Its body is defined using `body` in the YAML configuration. It can be",
      "    triggered by touching the `.github/test/commenter.yml' file in a PR.",
      "",
      "ExampleImplicitBodyFile:",
      "  where:",
      "    path:",
      '      matches: ".github/test/commenter/ExampleImplicitBodyFile.md"',
      "",
      "ExampleExplictBodyFileName:",
      "  where:",
      "    path:",
      '      matches: ".github/test/commenter/example-explicit.md"',
      '  body-file-name: "example-explicit.md"',
      "",
      "ExampleExplictBodyFile:",
      "  where:",
      "    path:",
      '      matches: ".github/test/example-explicit.md"',
      '  body-file: ".github/test/example-explicit.md"',
    ].join("\n");

    const config = loadConfigationYaml(yaml);

    expect(config.size).toEqual(4);
  });
});

describe("getConfigurations", () => {
  it("loads a basic configuration", async () => {
    const yaml = [
      "README:",
      "  where:",
      "    path:",
      "      matches: README.md",
      "  body: |",
      "    Comment body",
      "",
    ].join("\n");

    reposMock
      .mockResolvedValueOnce(<any>{
        // request for config file
        data: { type: "file", content: yaml, encoding: "utf8" },
      })
      .mockResolvedValueOnce(<any>{
        // request for body-file prefix
        data: [],
      });

    const config = await getConfigurations(
      gh,
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
    const yaml = [
      "README:",
      "  where:",
      "    path:",
      "      matches: README.md",
      "",
    ].join("\n");

    reposMock
      .mockResolvedValueOnce(<any>{
        // request for config file
        data: { type: "file", content: yaml, encoding: "utf8" },
      })
      .mockResolvedValueOnce(<any>{
        // request for body-file prefix
        data: [{ type: "file", path: ".github/commenter/README.md" }],
      })
      .mockResolvedValueOnce(<any>{
        // request for body-file itself
        data: { type: "file", content: "Comment body\n", encoding: "utf8" },
      });

    const config = await getConfigurations(
      gh,
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
