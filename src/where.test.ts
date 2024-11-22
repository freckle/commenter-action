import { Changes } from "./changes";
import { ConfigurationWhereClause } from "./where";
import * as where from "./where";

type TestCase = {
  changes: Changes;
  expected: boolean;
  name: string;
  clause: ConfigurationWhereClause;
};

const changes: Changes = {
  changedFiles: [
    {
      filename: "foo.ts",
      patch: "+ adding unsafe\n- removing safe\n",
    },
    {
      filename: "bar.ts",
      patch: "",
    },
    {
      filename: "baz/quiz.ts",
      patch: "- removing important\n+ adding unimportant\n",
    },
  ],
  author: "pbrisbin",
  labels: ["feature", "v2"],
};

// Manually align this, so it can be more easily scanned
// prettier-ignore
const cases: TestCase[] = [
  { changes, expected: true,  name: "path",                          clause: { path: { matches: "baz/*.ts"    }}},
  { changes, expected: true,  name: "author",                        clause: { path: { matches: "baz/*.ts"    }, author: { any: ["dependabot", "pbrisbin"] }}},
  { changes, expected: true,  name: "label",                         clause: { path: { matches: "baz/*.ts"    }, labels: { any: ["v2"] }}},
  { changes, expected: true,  name: "diff.contains",                 clause: { path: { matches: "foo.ts"      }, diff: { contains: ["unsafe"] }}},
  { changes, expected: true,  name: "diff.adds",                     clause: { path: { matches: "foo.ts"      }, diff: { adds: ["unsafe"] }}},
  { changes, expected: true,  name: "diff.removes",                  clause: { path: { matches: "baz/quiz.ts" }, diff: { removes: ["important"] }}},
  { changes, expected: true,  name: "additions_or_deletions",        clause: { path: { matches: "foo.ts"      }, additions_or_deletions: { contain: ["unsafe"] }}},
  { changes, expected: false, name: "path",                          clause: { path: { matches: "other.ts"    }}},
  { changes, expected: false, name: "author",                        clause: { path: { matches: "baz/*.ts"    }, author: { any: ["dependabot"] }}},
  { changes, expected: false, name: "label",                         clause: { path: { matches: "baz/*.ts"    }, labels: { any: ["bugfix"] }}},
  { changes, expected: false, name: "diff.contains",                 clause: { path: { matches: "foo.ts"      }, diff: { contains: ["something else"] }}},
  { changes, expected: false, name: "diff.adds",                     clause: { path: { matches: "foo.ts"      }, diff: { adds: ["important"] }}},
  { changes, expected: false, name: "diff.removes",                  clause: { path: { matches: "baz/quiz.ts" }, diff: { removes: ["something"] }}},
  { changes, expected: false, name: "additions_or_deletions",        clause: { path: { matches: "foo.ts"      }, additions_or_deletions: { contain: ["something else"] }}},
  { changes, expected: false, name: "file's additions_or_deletions", clause: { path: { matches: "baz/*.ts"    }, additions_or_deletions: { contain: ["unsafe"] }}},
];

describe("matches", () => {
  it.each(cases)(
    "where.matches($name): $expected",
    ({ changes, clause, expected }) => {
      expect(where.matches(changes, clause)).toBe(expected);
    },
  );
});
