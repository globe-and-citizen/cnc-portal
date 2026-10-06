---
name: cnc-github-flow
description: Manage CNC Portal GitHub issues, Sprint hierarchy, pull requests, reviews, and publication. Use when creating or updating an issue or PR, linking work to a Sprint, reviewing a PR, or publishing a prepared feature branch.
---

# CNC GitHub flow

Use `gh`, not the GitHub MCP. Keep GitHub text in English, conventional-commit plus gitmoji titles, and public-repository hygiene from
`AGENTS.md`.

## Create or organize an issue

1. Search open issues before creating a duplicate. For audits, fetch `origin/develop` and compare delivered code before treating an item as
   shipped.
2. Resolve the assignee dynamically unless the user names another owner:

   ```bash
   gh api user --jq .login
   ```

3. Give the issue a concise problem, scope boundary, acceptance criteria, and validation evidence expected. Complete its relationship plan
   using [Development Relationship Validation](../../../docs/development-guide/relationship-validation.md), including affected consumers,
   applicability, and completion proposals. Assign it to the current authenticated user.
4. Identify the native parent before creating or reusing an issue. Sprint and backlog planning issues are explicit roots; attach Goals
   beneath the Sprint, coordinating issues beneath the relevant Goal, delivery issues beneath the relevant Goal or coordinator, and backlog
   work beneath its appropriate backlog parent. If the intended parent does not exist, establish its place in the hierarchy first. Do not
   leave a work issue orphaned. Attach a child using its database id, not its issue number:

   ```bash
   CHILD_ID=$(gh api "repos/globe-and-citizen/cnc-portal/issues/<child-number>" --jq .id)
   gh api --method POST "repos/globe-and-citizen/cnc-portal/issues/<parent-number>/sub_issues" -F sub_issue_id="$CHILD_ID"
   ```

5. Read back the child's native parent and the parent's sub-issue list. Resolve any mismatch before treating the issue as placed.

## Keep parent issues current

When a child issue's scope, plan, status, blocker, validation evidence, or completion changes:

1. Read the child's current state, its native parent, and the affected ancestor chain. Record the change on the immediate parent in the same
   workflow. Use a concise comment for the dated progress or decision; edit the parent's description or checklist when its durable plan,
   scope, dependencies, or completion criteria have changed. Link the child and its evidence.
2. Continue up the ancestor chain wherever the change affects an outcome, plan, blocker, status, or checklist. Reconcile a moved child with
   both its old and new parent chains. Keep each parent's summary consistent with its actual native children and evidence; do not check off
   a task, claim validation, or close a parent solely because a child or PR closed. Reassess each parent's Project status against its own
   exit criteria and update it when warranted.
3. Read back the updated parent descriptions, comments, checklists, and project status. Leave unresolved decisions or missing evidence
   visible rather than presenting the parent as complete.

## Publish a branch

1. Confirm the branch is `feature/<slug>` and inspect the exact diff before staging. Do not stage unrelated work.
2. Run the validation listed in `AGENTS.md` for every touched subproject.
3. Commit each logical change atomically, then push the feature branch. Never push directly to `main`, `master`, or `develop`; never
   force-push without explicit approval.
4. Open a draft PR against `develop` unless the user asks for review-ready status. Use `.github/pull_request_template.md`, describe user or
   developer impact and validation, complete the relationship results with revision and evidence, and include `Closes #N` or `Fixes #N`.
   Keep unresolved required guarantees visible in drafts and resolve them before requesting review. Write multiline Markdown to a body file
   and pass it through `--body-file`; do not pass escaped `\n` in a shell `--body` string. Read the published body back before considering
   the artifact complete.

## Review routing

Use `cnc-pr-review` for a full PR review. Post genuine findings inline through the reviews API, use `REQUEST_CHANGES` for real bugs or unmet
requirements, and never auto-approve.

Before an authorized merge, apply the guide's final validation stage to the exact PR head and current target revision. Refresh results
affected by new commits or synchronization and verify live required checks; prior green results do not establish current readiness.
