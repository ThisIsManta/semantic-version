Once installed, this package verifies your upcoming **Git commit messages** against the convention and automatically runs `npm version` after a commit if needed.

## Git commit message convention

```
<type>[!]: <subject>
```
Where
- `<type>` can be either `feat`, `fix`, `test`, `refactor` or `chore`.
- `!` indicates that the commit contains breaking changes.
- `<subject>` is the actual commit message where the first word must be written in lower cases.

## Versioning

|Commit message type|Post-commit command|
|---|---|
|`!`|`npm version major`|
|`feat`|`npm version minor`|
|`fix`|`npm version patch`|
|Others|Does not run `npm version`|