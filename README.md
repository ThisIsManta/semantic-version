# `npx lint-commit-message <path>`

The `<path>` must point to a text file containing commit message that complies with the following pattern:

```
<type>[!]: <subject>
```
Where
- `<type>` can be either `feat`, `fix`, `test`, `refactor` or `chore`.
- `!` indicates that the commit contains breaking changes.
- `<subject>` is the actual commit message where the first word must be written in lower cases.

> Usage example with [**lefthook**](https://www.npmjs.com/package/lefthook)
> ```yml
> # lefthook.yml
> commit-msg:
>   commands:
>     lint:
>       run: npx lint-commit-message {1}
> ```

# `npx auto-npm-version`

This command is supposed to be run on CI, such as **GitHub Actions**. It will run `npm version <new-version>`, which `<new-version>` is automatically derived from your commit messages according to the table below and then it creates a new entry on [**GitHub releases**](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

|Commit message type|Post-commit command|
|---|---|
|`!`|`npm version major`|
|`feat`|`npm version minor`|
|`fix`|`npm version patch`|
|Others|Does not run `npm version`|

> Usage example with **GitHub Actions**
> ```yml
> on:
>   push:
>     branches: [master]
> jobs:
>   release:
>     runs-on: ubuntu-latest
>     steps:
>       - uses: actions/checkout@v4
>         with:
>           fetch-depth: 0 # Ensure Git tags are fetched
>       - uses: actions/setup-node@v4
>         with:
>           node-version-file: 'package.json'
>           cache: npm
>       - run: npm ci # Install semantic-version as part of the dependencies
>       - run: npx auto-npm-version
>         env:
>           GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Make it possible to create a new release using GitHub API
> ```
