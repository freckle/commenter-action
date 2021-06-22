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

## Acknowledgements

This action was highly inspired by (and began as a copy of)
[`@actions/labeler`][labeler].

[labeler]: https://github.com/actions/labeler

---

[LICENSE](./LICENSE) | [CHANGELOG](./CHANGELOG.md)
