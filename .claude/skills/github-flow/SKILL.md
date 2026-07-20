---
name: github-flow
description: >-
  Manage GitHub issues and pull requests for the cnc-portal repo the way the team does.
  Use when the user wants to create/open an issue, open or update a pull request, review a PR,
  or do issue/PR housekeeping (retitle, relink issue↔PR, reorganize the sub-issue tree,
  close or dedupe). Enforces Conventional-Commits + gitmoji titles, mandatory issue↔PR
  linking, English-only content, gh CLI over the GitHub MCP, and infra-secret hygiene.
  Triggers: "crée une issue", "ouvre une PR", "review cette PR", "range l'issue", "link the PR",
  "open a pull request", "reorganize the sprint tree".
---

# GitHub flow — cnc-portal

Author and maintain issues & PRs so they pass review the first time. This skill routes by
intent to one of four modes. It **defers** the heavy lifting to canonical sources and existing
skills rather than duplicating them:

- Bug-hunting a diff → `/code-review`; auditing that an issue is actually implemented →
  the `review-issue` skill. A full PR review (Mode 3) drives **both** and posts the findings.
- Full rule text → `AGENTS.md` and `.github/copilot-instructions/`.

## Routing

| The user wants to… | Go to |
| --- | --- |
| File a new issue (bug / feature / sprint plan) | **Mode 1 — Create issue** |
| Commit + push + open (or update) a PR | **Mode 2 — Open PR** |
| Review someone's PR | **Mode 3 — Review PR** |
| Retitle, relink, reorganize, close, or dedupe issues/PRs | **Mode 4 — Housekeeping** |

---

## Shared rulebook (every mode)

- **Titles = Conventional Commits + gitmoji, no scope**: `<type><emoji>: <subject>`.
  `feat ✨ · fix 🐛 · refactor ♻️ · docs 📝 · test ✅ · chore 🔧 · perf ⚡️ · build 📦 · ci 👷 · style 💄`.
  Imperative present, subject ≤ 72 chars, no trailing period. Same format for issue titles,
  PR titles, and commit subjects.
- **Everything user-facing is English** — issue/PR titles & bodies, commit messages, review
  comments, UI strings. Chat can be French; the artifact is English.
- **Issue ↔ PR linking is mandatory.** Every PR references an issue via a closing keyword in the
  **body** (`Closes #N` / `Fixes #N`), not via a commit trailer. Even typos/chores get a tracking
  issue. New issues are **assigned to `hermannleboss`**.
- **Tooling: `gh` CLI**, not `mcp__github__*` (the MCP server is unreliable). Repo is
  `globe-and-citizen/cnc-portal`; default base branch is `develop`.
- **Never** add `Co-Authored-By` trailers or a "🤖 Generated with Claude Code" footer to any
  artifact (commit, PR, issue, comment) — on any tool path.
- **Infra-secret hygiene**: no hostnames, ports, bucket names, or cloud-provider names in issues,
  PRs, commits, docs, or review comments. Use placeholders like
  `postgresql://<user>:<password>@<host>:<port>/<db>` and say "our managed provider".
- **Branches**: work on `feature/<slug>` (kebab-case). If the session is on a harness `claude/*`
  branch, rename before the first commit: `git branch -m feature/<slug>`.
- **Push**: auto-push to the current feature branch after committing. **Never** auto-push to
  `main`/`master`/`develop`; never `--force` unless asked.

---

## Mode 1 — Create an issue

1. **Choose the template** (`.github/ISSUE_TEMPLATE/`): `bug_report`, `feature_request`, or
   `sprint_planning`. Match the body structure the template implies (repro steps for bugs;
   problem + solution + **Acceptance Criteria** for features).
2. **Write the title** per the shared rulebook (Conventional + gitmoji).
3. **Create it, assigned to `hermannleboss`**:
   ```bash
   gh issue create --title "feat: ✨ …" --body-file <(printf '%s' "$BODY") \
     --assignee hermannleboss --label enhancement
   ```
4. **Place it in the hierarchy.** Issues form a sub-issue tree; `[Group]` container issues only
   at **3+ children**. Sprint plans follow `[Sprint] → [Goals] → concrete tickets`, never a flat
   list. If it belongs to the current sprint, attach it under the active sprint parent — **look up
   the current sprint parent** (Project #13 "Sprint Iteration"); do not hardcode an old parent
   number. See **Recipes → sub-issues**.
5. Keep it English and infra-clean.

---

## Mode 2 — Open (or update) a PR

1. **Branch check.** Confirm you're on `feature/<slug>`; rename a `claude/*` branch first
   (`git branch -m feature/<slug>`). Never commit onto a protected branch.
2. **Code-quality gate (mandatory before push).** Run it for **every touched subproject** — see
   `AGENTS.md` § "Code quality gate" and `CONTRIBUTION.md`:
   - `app/`: `build` · `test:unit` · `type-check` · `lint` · `format`
     (type-check needs a build first — `CI=1 npm run build-only` then `npm run type-check`).
   - `backend/`: `build` · `test` · `lint` · `format`
   - `contract/`: `test` · `lint` · `format` (+ Slither runs in CI, blocks on new high/medium).
   Run `prettier --write` on touched `app/`/`backend/` files; use `eslint --fix` in `dashboard/`.
3. **Commit atomically** — one commit per logical change, Conventional + gitmoji, committed as
   each piece lands. Don't squash the whole PR into one commit at the end.
4. **Ensure a linked issue exists** and is assigned to `hermannleboss`. If none fits, create one
   first (Mode 1). The issue is the *why*, the PR is the *how*.
5. **Push** the feature branch, then **open the PR** against `develop`, filling
   `.github/pull_request_template.md` and adding `Closes #N` in the body:
   ```bash
   git push -u origin HEAD
   gh pr create --base develop --title "fix: 🐛 …" --body-file <(printf '%s' "$BODY")
   ```
6. **Gates to expect on `develop`**: `codecov/patch` (target 50%) and `codecov/project` are
   branch-protection-required — a thin patch blocks merge even though the codecov comment says
   "informational". Add tests to clear it.
7. No Claude footer, no co-author trailer.

---

## Mode 3 — Review a PR

A complete review runs **two independent axes** — a PR can pass one and fail the other, so always
check both:

| Axis | Question it answers | Oriented around | Tool |
| --- | --- | --- | --- |
| **A. Requirements conformance** | Does the PR deliver what the linked issue asked — every acceptance criterion met, nothing missing, nothing out of scope? | the **issue** | `review-issue` skill |
| **B. Code review** | Is the code that's there correct, safe, and clean — bugs, edge cases, security, conventions? | the **diff** | `/code-review` |

> **The difference**: Axis A is *completeness & scope* — "did they build the right thing?" Axis B
> is *correctness & quality* — "did they build the thing right?" A bug-free PR that implements only
> half the acceptance criteria fails A; a feature-complete PR with a null-deref fails B. Both must
> pass before approval, and they can disagree — never sign off on one axis alone.

1. **Axis A — requirements.** Resolve the linked issue (`Closes #N`, or the kanban link in the PR
   body), read its acceptance criteria, and run the `review-issue` skill to compare them against
   the branch/PR diff. Report gaps split into **MUST-FIX** (an acceptance criterion is unmet, a
   regression, or a scope violation) vs **SUGGESTED** (nice-to-have / follow-up). A PR with **no
   linked issue** is itself a MUST-FIX (see the shared rulebook) — there's nothing to conform to.
2. **Axis B — code.** Run `/code-review` (or the `feature-dev:code-reviewer` agent) on the diff.
   For any PR touching `contract/`, also work through
   `.github/copilot-instructions/solidity-audit-checklist.md`. Sanity-check against
   `.github/copilot-instructions/review-checklist.md`.
3. **Post findings inline, on the relevant lines** — via the pulls/reviews API, **not** one
   standalone summary comment. The review `body` carries the summary **and** the Axis-A verdict
   (criteria met vs. gaps); each Axis-B finding is its own line comment. See
   **Recipes → inline review**.
4. **Reviews teach, they don't prescribe.** Each point = *what's wrong + why it matters + the
   principle/question to apply next time*. Surface the underlying principle so it transfers. Do
   **not** write the fixed code — the author does the rewrite.
5. **Event**: `REQUEST_CHANGES` if any MUST-FIX exists on **either** axis (unmet criterion *or*
   real bug); `COMMENT` for nits/observations only. **Never** auto-`APPROVE`.

---

## Mode 4 — Housekeeping

Act on the issue/PR itself like a dev/PM would (the `review-issue` skill covers the deeper
"is it actually implemented?" audit — reach for it when the ask is about implementation fidelity).

- **Retitle** to the Conventional + gitmoji format (`gh issue edit N --title …` /
  `gh pr edit N --title …`).
- **Relink** issue ↔ PR: add `Closes #N` to the PR body; cross-reference from the issue.
- **Reorganize the sub-issue tree** — promote a `[Group]` container only at 3+ children;
  keep sprint membership = the `[Sprint]` plan tree. See **Recipes → sub-issues**.
- **Close / dedupe** with a reason (`gh issue close N --reason "not planned"` or link the
  duplicate). Don't silently delete.
- Keep everything English and infra-clean.

---

## Recipes (non-obvious gh commands)

**Inline PR review** — build the payload as a file, then POST it (robust vs. shell array quoting):
```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
cat > /tmp/review.json <<'JSON'
{
  "event": "REQUEST_CHANGES",
  "body": "Overall summary here — the *why* of the review.",
  "comments": [
    { "path": "app/src/foo.ts", "line": 42,
      "body": "What's wrong + why it matters + the principle to apply next time." }
  ]
}
JSON
gh api "repos/$REPO/pulls/<PR>/reviews" --input /tmp/review.json
```

**Sub-issues** (REST; needs the child's numeric **database id**, not its `#number`):
```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
CHILD_ID=$(gh api "repos/$REPO/issues/<child#>" -q .id)
gh api --method POST "repos/$REPO/issues/<parent#>/sub_issues" -F sub_issue_id="$CHILD_ID"
```

**zsh caveat** (the Bash tool runs zsh): `for n in $var` iterates once. Use `${=var}` or an array;
for multi-item GraphQL, write the query to a temp file and `gh api graphql -f query=@file`.

## Canonical sources (read when unsure — don't re-derive)

- `AGENTS.md` — orientation + code-quality gate + PR checklist.
- `.github/copilot-instructions/commit-conventions.md` — full type→gitmoji table & examples.
- `.github/copilot-instructions/review-checklist.md` — what reviewers check.
- `.github/copilot-instructions/solidity-audit-checklist.md` — required for `contract/` PRs.
- `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/*` — the templates to fill.
- `CONTRIBUTION.md` — per-folder command list.
