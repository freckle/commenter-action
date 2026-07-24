/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi } from "vitest";
import * as github from "@actions/github";

import { getConfigurations } from "./configuration.js";

vi.mock("@actions/core");
vi.mock("@actions/github");

const gh = github.getOctokit("_");
const reposMock = vi.spyOn(gh.rest.repos, "getContent");

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
        where: { path: { matches: "README.md" } },
        body: "Comment body\n",
      },
    ]);
  });
});
