# Pull Request Commenter

## Usage

### Create `.github/commenter.yml`

```yaml
Backend:
  paths:
    - "backend/**/*"
  body: |
    :wave: You've changed Backend code, please:

    - [ ] Do this
    - [ ] And this
    - [ ] And that

Frontend:
  paths:
    - "frontend/**/*"
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
    - uses: actions/commenter@main
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

## Inputs

See [`action.yml`](./action.yml).

## Additional Options

You can also match based specific file changes by supplying the `where`
configuration key.

For example, if you wanted to comment on any changes that contain the word
"unsafe" you could supply a YAML configuration like the following

```yaml
UnsafeMentionedInCode:
  paths:
    - "backend/**/*.hs"
  where:
    patch:
      additions_or_deletions:
        contain:
          - unsafe
  body: |
    :wave: Hi, I see a mention of "unsafe" in Haskell code. If you removed it,
    good going! If you added it, please consider finding a safer alternative!
```

## Acknowledgements

This action was highly inspired by (and began as a copy of)
[`@actions/labeler`][labeler].

[labeler]: https://github.com/actions/labeler

---

[LICENSE](./LICENSE) | [CHANGELOG](./CHANGELOG.md)
