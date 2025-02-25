# Pull Request Commenter

## Configuration

```yaml
# .github/commenter.yml

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

<!-- action-docs-usage action="action.yml" project="freckle/commenter-action" version="v1" -->

## Usage

```yaml
- uses: freckle/commenter-action@v1
  with:
    repo-token:
    # The `GITHUB_TOKEN` secret
    #
    # Required: false
    # Default: ${{ github.token }}

    configuration-path:
    # The path for the comment configurations
    #
    # Required: false
    # Default: .github/commenter.yml

    body-file-prefix:
    # The path for finding body markdown files
    #
    # Required: false
    # Default: .github/commenter/
```

<!-- action-docs-usage action="action.yml" project="freckle/commenter-action" version="v1" -->

<!-- action-docs-inputs action="action.yml" -->

## Inputs

| name                 | description                                     | required | default                 |
| -------------------- | ----------------------------------------------- | -------- | ----------------------- |
| `repo-token`         | <p>The <code>GITHUB_TOKEN</code> secret</p>     | `false`  | `${{ github.token }}`   |
| `configuration-path` | <p>The path for the comment configurations</p>  | `false`  | `.github/commenter.yml` |
| `body-file-prefix`   | <p>The path for finding body markdown files</p> | `false`  | `.github/commenter/`    |

<!-- action-docs-inputs action="action.yml" -->

## Permissions

Running this action requires the following permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
```

These are required to be explicitly set for repositories with [restricted
default access][perms] for workflows or to allow a workflow run triggered by
Dependabot pull requests, which are run as if they are from a forked repository
and use a read-only `GITHUB_TOKEN`.

[perms]: https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token

## Additional Options

You can also match based on specific file changes by supplying the
`diff` `where`-clause configuration key.

For example, if you wanted to comment on any changes that contain the word
"unsafe" you could supply a YAML configuration like the following

```yaml
UnsafeMentionedInCode:
  where:
    path:
      matches: "backend/**/*.hs"
    diff:
      contains:
        - unsafe
  body: |
    :wave: Hi, I see a mention of "unsafe" in Haskell code. If you removed it,
    good going! If you added it, please consider finding a safer alternative!
```

`diff.adds` and `diff.removes` are also supported, to match on specifically
additions or removals of certain text.

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

## Reading the Comment Body from a File

If `body` is omitted, a file named `.github/commenter/{name}.md` is read from
the default branch for the comment contents. The `.github/commenter/` prefix can
be changed via `inputs.body-file-prefix`. The complete path, or just the name
part, can be specified via the `body-file` and `body-file-name` attributes of
the configuration, respectively.

## Acknowledgements

This action was highly inspired by (and began as a copy of)
[`@actions/labeler`][labeler].

[labeler]: https://github.com/actions/labeler

---

[LICENSE](./LICENSE) | [CHANGELOG](./CHANGELOG.md)
