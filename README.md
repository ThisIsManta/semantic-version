The following commands respect [`packageManager`](https://github.com/nodejs/corepack?tab=readme-ov-file#when-authoring-packages) field first then [`devEngines.packageManager.name`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#devengines) in _package.json_, but fallback to **npm** if none is specified.

---

### `npx lint-commit-message <path>`

The `<path>` must point to a text file containing commit message that complies with the following pattern:

```
<type>[!]: <subject>
```

Where

- `<type>` can be either `feat`, `fix`, `build` or `chore`.
- `!` indicates that the commit contains a breaking change.
- `<subject>` is the actual commit message where the first word must be written in lower cases.

Usage example with [**lefthook**](https://www.npmjs.com/package/lefthook):

```yml
# lefthook.yml
commit-msg:
  commands:
    lint:
      run: npx lint-commit-message {1}
```

---

### `npx make-next-release`

This command is supposed to be run on **GitHub Actions**. It will run `npm version <new-version>`, which `<new-version>` is automatically derived from your commit messages according to the table below and then it creates a new entry on [**GitHub releases**](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

| Commit message type | Trigger                    |
| ------------------- | -------------------------- |
| `!`                 | `npm version major`        |
| `feat`              | `npm version minor`        |
| `fix` or `build`    | `npm version patch`        |
| Others              | Does not run `npm version` |

```yml
# .github/workflows/push.yml
on:
   push:
     branches: [master]

 jobs:
   release:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v6
         with:
           fetch-depth: 0 # Ensure Git tags are fetched

       - uses: actions/setup-node@v6
         with:
           node-version-file: 'package.json'
           cache: npm

       - run: npm ci # Install semantic-version as part of the dependencies

       - run: npx make-next-release
         env:
           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Make it possible to create a new release using GitHub API
```
