# Commit Message Conventions

> Authoritative source: [`AGENTS.md`](../../AGENTS.md). This file expands the rationale.

## Format

```text
<type><gitmoji>: <subject>

[optional body]
[optional footer]
```

- **No scope.** Don't write `feat(api): …` — just `feat: …`.
- **Gitmoji is required**, paired with the type.
- **Imperative, present tense** in the subject ("add", not "added").
- **Subject ≤ 72 chars, no trailing period.**
- Same format applies to **issue titles and PR titles**.

## Type → gitmoji mapping

| Type | Gitmoji | Use for |
| --- | --- | --- |
| `feat` | ✨ | New feature |
| `fix` | 🐛 | Bug fix |
| `refactor` | ♻️ | Code change without behavior change |
| `docs` | 📝 | Documentation only |
| `test` | ✅ | Adding/updating tests |
| `chore` | 🔧 | Tooling, deps, housekeeping |
| `style` | 💄 | Formatting / UI style only |
| `perf` | ⚡️ | Performance improvement |
| `build` | 📦 | Build system or external deps |
| `ci` | 👷 | CI configuration |

## Examples

Good:

```text
feat: ✨ add token selection dropdown
fix: 🐛 handle null team owner
refactor: ♻️ extract shared validation logic
docs: 📝 update README env-var section
chore: 🔧 bump prettier to 3.6.2
```

Bad:

```text
fix: bug
feat: added some stuff
update: changes
feat(api): ✨ add endpoint   ← no scopes
```

## Atomic commits

One commit per logical change. **Do not** batch unrelated changes, and **do not** squash an entire PR into a single commit at the end. Commit as each piece lands so the history is reviewable.

## Body & footer (optional)

- **Body** — explain *why*, not *what*. Separate from subject with a blank line.
- **Breaking changes** — append `!` after the type (e.g. `feat!: ✨ …`) and describe in the body.
- **Issue refs** — link via the PR description rather than commit footers; the team relies on PR-level linking, not `Fixes #123` trailers.

## Never

- `Co-Authored-By` trailers (per project policy).
- "🤖 Generated with Claude Code" footers.
- Non-English subjects.

## Release notes

Conventional commit messages enable changelog generation via the root-level script:

```bash
npx conventional-changelog -p angular -i CHANGELOG.md -s
```
