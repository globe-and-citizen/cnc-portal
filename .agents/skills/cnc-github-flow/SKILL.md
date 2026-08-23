---
name: cnc-github-flow
description: Manage CNC Portal GitHub issues, Sprint hierarchy, pull requests, reviews, and publication. Use when creating or updating an issue or PR, linking work to a Sprint, reviewing a PR, or publishing a prepared feature branch.
---

# CNC GitHub flow

Use `gh`, not the GitHub MCP. Keep GitHub text in English, conventional-commit plus gitmoji titles, and
public-repository hygiene from `AGENTS.md`.

## Create or organize an issue

1. Search open issues before creating a duplicate. For audits, fetch `origin/develop` and compare delivered code before
   treating an item as shipped.
2. Resolve the assignee dynamically unless the user names another owner:

   ```bash
   gh api user --jq .login
   ```

3. Give the issue a concise problem, scope boundary, acceptance criteria, and validation evidence expected. Assign it to
   the current authenticated user.
4. Place Sprint work under the right Goal. Attach a child using its database id, not its issue number:

   ```bash
   CHILD_ID=$(gh api "repos/globe-and-citizen/cnc-portal/issues/<child-number>" --jq .id)
   gh api --method POST "repos/globe-and-citizen/cnc-portal/issues/<parent-number>/sub_issues" -F sub_issue_id="$CHILD_ID"
   ```

## Publish a branch

1. Confirm the branch is `feature/<slug>` and inspect the exact diff before staging. Do not stage unrelated work.
2. Run the validation listed in `AGENTS.md` for every touched subproject.
3. Commit each logical change atomically, then push the feature branch. Never push directly to `main`, `master`, or
   `develop`; never force-push without explicit approval.
4. Open a draft PR against `develop` unless the user asks for review-ready status. Use
   `.github/pull_request_template.md`, describe user or developer impact and validation, and include `Closes #N` or
   `Fixes #N`. Write multiline Markdown to a body file and pass it through `--body-file`; do not pass escaped `\n` in a
   shell `--body` string. Read the published body back before considering the artifact complete.

## Review routing

Use `cnc-pr-review` for a full PR review. Post genuine findings inline through the reviews API, use `REQUEST_CHANGES`
for real bugs or unmet requirements, and never auto-approve.
