# Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

**Scopes:** components, stores, utils, types, api, contracts, subgraph, tests, docs, config

**Guidelines:**

- Use imperative mood ("add", not "added")
- Subject ≤ 72 chars, no period
- Be specific and descriptive
- Reference issues/PRs in footer if needed
- For breaking changes, add `!` after type/scope and explain in body

**Examples:**

```text
feat(components): add token selection dropdown
fix(api): handle network errors gracefully
docs: update README
refactor(utils): extract shared validation logic
chore(deps): update security dependencies
```

**Good:**

```text
feat(stores): implement user preference management
fix(web3): validate address format before contract call
```

**Bad:**

```text
fix: bug
feat: added some stuff
update: changes
```

**Body (optional):**

- Explain what and why, not how
- Separate from subject with blank line

**Footer (optional):**

- Reference issues, PRs, or breaking changes

```text
Fixes #123
BREAKING CHANGE: API now requires JWT auth
```

**Automation:**

- Commit messages are checked by commitlint and pre-commit hook:

```bash
npx commitlint --edit $1
```

- Use VS Code "Conventional Commits" extension for help

**Release notes:**

- Proper commit messages enable changelog and release note generation:

```bash
npx conventional-changelog -p angular -i CHANGELOG.md -s
gh release create v1.2.0 --generate-notes
```

**Summary:**

- Clear, consistent commit messages = better history, changelogs, and collaboration.
