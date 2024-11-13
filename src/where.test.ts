import { Changes } from "./changes";
import { ConfigurationWhereClause } from "./where";
import * as where from "./where";

type TestCase = {
  attr: string;
  changes: Changes;
  clause: ConfigurationWhereClause;
};

const changes: Changes = {
  changedFiles: [
    {
      filename: "foo.ts",
      patch: "+ adding unsafe",
    },
    {
      filename: "bar.ts",
      patch: "",
    },
    {
      filename: "baz/quiz.ts",
      patch: "",
    },
  ],
  author: "pbrisbin",
  labels: ["feature", "v2"],
};

const matched: TestCase[] = [
  {
    attr: "path",
    changes,
    clause: {
      path: { matches: "baz/*.ts" },
    },
  },
  {
    attr: "author",
    changes,
    clause: {
      path: { matches: "baz/*.ts" },
      author: { any: ["dependabot", "pbrisbin"] },
    },
  },
  {
    attr: "label",
    changes,
    clause: {
      path: { matches: "baz/*.ts" },
      labels: { any: ["v2"] },
    },
  },
  {
    attr: "additions_or_deletions",
    changes,
    clause: {
      path: { matches: "foo.ts" },
      additions_or_deletions: { contain: ["unsafe"] },
    },
  },
];

const missed: TestCase[] = [
  {
    attr: "path",
    changes,
    clause: {
      path: { matches: "other.ts" },
    },
  },
  {
    attr: "author",
    changes,
    clause: {
      path: { matches: "baz/*.ts" },
      author: { any: ["dependabot"] },
    },
  },
  {
    attr: "label",
    changes,
    clause: {
      path: { matches: "baz/*.ts" },
      labels: { any: ["bugfix"] },
    },
  },
  {
    attr: "additions_or_deletions",
    changes,
    clause: {
      path: { matches: "foo.ts" },
      additions_or_deletions: { contain: ["something else"] },
    },
  },
  {
    attr: "file's additions_or_deletions",
    changes,
    clause: {
      path: { matches: "baz/*.ts" },
      additions_or_deletions: { contain: ["unsafe"] },
    },
  },
];

describe("matches", () => {
  it.each(matched)("matches by $attr", ({ changes, clause }) => {
    expect(where.matches(changes, clause)).toBe(true);
  });

  it.each(missed)("does not match a different $attr", ({ changes, clause }) => {
    expect(where.matches(changes, clause)).toBe(false);
  });
});
