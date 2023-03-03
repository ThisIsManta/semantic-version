Once installed, this package verifies your upcoming **Git commit messages** against the convention below.

```
<type>[!]: <subject>
```
Where
- `<type>` can be either `feat`, `fix`, `test`, `refactor` or `chore`.
- `!` indicates that the commit contains breaking changes.
- `<subject>` is the actual commit message where the first word must be written in lower cases.

---

Additionally, you can run `npx auto-npm-version` on **GitHub Actions** to trigger `npm version` based on your commit messages and create a GitHub release (optional).

|Commit message type|Post-commit command|
|---|---|
|`!`|`npm version major`|
|`feat`|`npm version minor`|
|`fix`|`npm version patch`|
|Others|Does not run `npm version`|

Here's an example of **GitHub Actions** workflow file:

```yml
on:
  push:
    branches: [master]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Ensure Git tags are fetched
      - uses: actions/setup-node@v3
        with:
          node-version-file: 'package.json'
          cache: npm
      - run: npm ci # Install semantic-version as part of the dependencies
      - run: npx auto-npm-version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Make it possible to create a new release using GitHub API
```
