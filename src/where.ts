import { Minimatch } from "minimatch";

import type { Changes } from "./changes";

export type ConfigurationWhereClause = {
  path: {
    matches: string;
  };
  additions_or_deletions?: {
    contain: string[];
  };
  author?: {
    any: string[];
  };
  labels?: {
    any: string[];
  };
};

export function matches(
  changes: Changes,
  where: ConfigurationWhereClause,
): boolean {
  const { changedFiles, author, labels } = changes;
  const matcher = new Minimatch(where.path.matches);

  const hasFileMatch = changedFiles.some(
    ({ filename, patch }) =>
      matcher.match(filename) &&
      (!where.additions_or_deletions ||
        patchContains(patch, where.additions_or_deletions.contain)),
  );

  const hasAuthorMatch =
    !where.author ||
    (author !== undefined && where.author.any.includes(author));

  const hasLabelMatch =
    !where.labels || labels.some((label) => where.labels?.any.includes(label));

  return hasFileMatch && hasAuthorMatch && hasLabelMatch;
}

const patchContains = (patch: string, needles: string[]) =>
  needles.some((needle) => patch.includes(needle));
