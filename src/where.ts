import { Minimatch } from "minimatch";

import type { Changes } from "./changes";

export type ConfigurationWhereClause = {
  path: {
    matches: string;
  };
  diff?: Diff;
  author?: {
    any: string[];
  };
  labels?: {
    any: string[];
  };

  // deprecated, still supported
  additions_or_deletions?: {
    contain: string[];
  };
};

export function matches(
  changes: Changes,
  where: ConfigurationWhereClause,
): boolean {
  const { changedFiles, author, labels } = changes;
  const matcher = new Minimatch(where.path.matches);

  // Treat deprecated additions_or_deletions.contain as diff.contains, but note
  // that if additions_or_deletions is present, diff is ignored.
  const whereDiff = where.additions_or_deletions
    ? { contains: where.additions_or_deletions.contain }
    : where.diff;

  const hasFileMatch = changedFiles.some(({ filename, patch: rawPatch }) => {
    const patch = toPatch(rawPatch);
    const matchedDiff = whereDiff ? matchesDiff(patch, whereDiff) : true;
    return matcher.match(filename) && matchedDiff;
  });

  const hasAuthorMatch =
    !where.author ||
    (author !== undefined && where.author.any.includes(author));

  const hasLabelMatch =
    !where.labels || labels.some((label) => where.labels?.any.includes(label));

  return hasFileMatch && hasAuthorMatch && hasLabelMatch;
}

type Patch = {
  added: string[];
  removed: string[];
  lines: string[];
};

function toPatch(raw: string): Patch {
  const lines = raw.split("\n");
  const added = lines.filter((x) => x.match(/^\+ /));
  const removed = lines.filter((x) => x.match(/^- /));
  return { added, removed, lines };
}

type Diff = {
  contains?: string[];
  adds?: string[];
  removes?: string[];
};

function matchesDiff(
  { added, removed, lines }: Patch,
  { contains, adds, removes }: Diff,
): boolean {
  const bs = [
    contains && lines.length > 0
      ? contains.some((x) => lines.some((l) => l.includes(x)))
      : true,
    adds && added.length > 0
      ? adds.some((x) => added.some((l) => l.includes(x)))
      : true,
    removes && removed.length > 0
      ? removes.some((x) => removed.some((l) => l.includes(x)))
      : true,
  ];

  return bs.every((x) => x);
}
