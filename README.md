# Pull Request Commenter

## Usage

### Create `.github/commenter.yml`

```yaml
Backend:
  where:
    path:
      matches: "backend/**/*"
  body: |
    :wave: You've changed Backend code, please:

    - [ ] Do this
    - [ ] And this
    - [ ] And that

Frontend:
  where:
    path:
      matches: "frontend/**/*"
  body: |
    :wave: You've changed Frontend code, please:

    - [ ] Do this
    - [ ] And this
    - [ ] And that
```

The keys are ignored, and for your own organizational use. We will find the
**first** stanza where the PR's changed files matches **any** of the given
`paths` and add a comment with the given `body`.

### Create a Workflow

```
name: Checklists

on:
  pull_request:
    types: [opened]

jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/commenter@v1
```

## Inputs

See [`action.yml`](./action.yml).

## Permissions

Running this action requires the following permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
```

These are required to be explicitly set for repositories with [restricted
default access][perms] for workflows or to allow a workflow run triggered by
Dependabot pull requests, which are run as if they are from a forked
repository and use a read-only `GITHUB_TOKEN`.

[perms]: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token

## Additional Options

You can also match based on specific file changes by supplying the
`additions_or_deletions` `where`-clause configuration key.

For example, if you wanted to comment on any changes that contain the word
"unsafe" you could supply a YAML configuration like the following

```yaml
UnsafeMentionedInCode:
  where:
    path:
      matches: "backend/**/*.hs"
    additions_or_deletions:
      contain:
        - unsafe
  body: |
    :wave: Hi, I see a mention of "unsafe" in Haskell code. If you removed it,
    good going! If you added it, please consider finding a safer alternative!
```

Use `where.author.any` to only comment on PRs that authored by specific users,
and `where.labels.any` to only comment when specific labels are present. Keep
in mind that all `where` conditions must be satisfied for a comment to be made:

```yaml
CommentOnAutomatedUpdate:
  where:
    path:
      matches: "*/**/yarn.lock"
    author:
      any:
        - dependabot[bot]
    labels:
      any:
        - Frontend
  body: |
    This is an automated update to the frontend lockfile. Please verify the
    integrity of the packages being updated.
```

## Acknowledgements

This action was highly inspired by (and began as a copy of)
[`@actions/labeler`][labeler].

[labeler]: https://github.com/actions/labeler

---

[LICENSE](./LICENSE) | [CHANGELOG](./CHANGELOG.md)
