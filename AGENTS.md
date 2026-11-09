# AGENTS.md

Additional operating instructions for AI coding agents working in this repository. Human developers start with [README.md](./README.md) and
[CONTRIBUTION.md](./CONTRIBUTION.md).

Agents must first follow the [shared contribution contract](./CONTRIBUTION.md#shared-contribution-contract), including its implementation,
security, documentation, GitHub and review requirements. This file adds agent execution procedures; it does not replace the shared contract
or grant authority to make product decisions, merge, deploy or record human acceptance.

## Start here

1. Read the gitignored root `todolist.md`. Keep it accurate while working; use `(in_progress)` for active work and `[x]` only when it is
   complete. Do not commit it. Do not start work marked `(blocked by: …)` until its blocker is complete.
2. Read `reports/planning.md` when it exists and maintain it under the scratchpad rules below.
3. Read the [applicable implementation standards](./CONTRIBUTION.md#implementation-standards) and the repository skill for the requested
   task. Use the [shared validation commands](./CONTRIBUTION.md#required-validation-before-pushing) for each affected subproject.

## Agent planning scratchpad

- `reports/planning.md` is a local, Git-ignored work log for commitments made during agent conversations; never stage or commit it.
- Before creating or reorganizing local reports, use the local `reports/README.md` index and follow the
  [Local Reports Workspace guide](./docs/development-guide/local-reports.md). Keep producer-owned paths and historical evidence intact.
- When a concrete action is agreed during a conversation, add it to `Actions ouvertes` with a priority, status, next action and concise
  context or evidence. Keep statuses current: `À faire`, `En cours`, `Bloqué` or `À vérifier`.
- Do not treat the scratchpad as canonical product or implementation documentation. Durable decisions, acceptance criteria, issue status and
  delivery evidence belong in their canonical documentation or GitHub issue/PR.
- When an action is verified as complete, move it to `Historique terminé` with the completion date, result and evidence. Never delete a
  completed action automatically; preserve the trace unless the user explicitly requests an archival purge.
- At the end of a task, update the scratchpad so unfinished work and blockers remain visible for the next agent. Do not mark an item
  complete without executable, CI or explicit manual evidence appropriate to the work.

## Repository skills

Task-specific agent workflows are versioned under `.agents/skills/`. Use only the one that matches the work:

- `cnc-work-orchestrator` — plan dependencies and bounded multi-agent work.
- `cnc-code-audit` — audit a scoped checkout, propose concrete corrections, and track decisions, delivery and verification.
- `cnc-github-flow` — issues, Sprint hierarchy, PRs, reviews and publishing.
- `cnc-pr-review` — issue conformance and code-quality review.
- `cnc-docs-governance` — agent and implementation documentation.
- `cnc-feature-documentation` — implementation-backed product feature stories and acceptance.
- `cnc-frontend-change` — Vue client and Nuxt dashboard changes.
- `cnc-contract-change` — Solidity and ABI changes.

`CONTRIBUTION.md` owns shared contribution requirements. `AGENTS.md` owns additional agent execution rules. Skills contain task-specific
procedures; detailed implementation standards remain in their specialised guides.

Recurring AI-agent audits follow the [Autonomous Semantic Audit Contracts](./docs/development-guide/autonomous-audits/README.md). These
audits require contextual reasoning beyond deterministic CI output and may create tracked draft remediation PRs only within their documented
confidence and safety boundaries.

## Tool procedures

- Use `gh` for GitHub operations rather than the GitHub MCP. Human contributors are not required to use the CLI.
- For code generation, setup, configuration or library/API documentation, use Context7 to resolve library IDs and retrieve documentation.
  This includes implementation patterns and version-specific compatibility checks; do not wait for a separate user request to consult it.
- Write multiline GitHub Markdown to a body file and pass it through `--body-file`. Never pass escaped `\n` in a shell `--body` string.
- After creating or updating an issue or PR, read it back with `gh issue view` or `gh pr view`; verify headings, Markdown spacing, links and
  the PR's closing keyword before reporting publication complete.

## Issue and Project execution

- Before opening a PR, find or create its tracking issue and assign the authenticated user unless the task names another owner.
- Every agent-created or reused work issue must be on the [CNC Kanban Board](https://github.com/orgs/globe-and-citizen/projects/13).
  Maintain applicable Project fields at creation, implementation start/end, scope or Sprint changes, reopening and closure. Follow the
  [Kanban Project field contract](./docs/development-guide/kanban-project.md) for Size, Sprint Iteration, Status, Priority, Blocking, actual
  implementation dates and justified empty fields. Verify membership and values by readback; issue creation alone does not complete setup.
- Apply the shared native-parent and Sprint-placement rules through the [GitHub flow skill](./.agents/skills/cnc-github-flow/SKILL.md).
  Reconcile coordination and dependencies at ordinary parents, expected results and exit criteria at Goals, and agreed commitments and major
  blockers at Sprint roots. Keep routine PR, commit, CI and test progress on the delivery issue or PR.
- Update the Sprint root only when agreed objectives or scope, major Sprint-level blockers or verified Goal outcomes change. After closing
  an issue, reassess its native parent against its own scope, exit criteria and required validations; close eligible parents and repeat
  upward within the authorized work. A child closure or PR merge alone does not establish parent completion or human acceptance.
- Execute [Development Relationship Validation](./docs/development-guide/relationship-validation.md) at every required stage. Inspect
  affected consumers outside the diff and record applicability, evidence and concrete completion proposals in the issue/PR.

## Publishing and evidence

- Inspect the exact diff and keep unrelated work out of each atomic commit. Follow the GitHub flow skill for branch publication and draft PR
  creation. Push committed requested work on its feature branch; never auto-push to `main`, `master` or `develop`, force-push without
  authorization, or push unreviewed autonomous-loop commits.
- Run every applicable [shared validation check](./CONTRIBUTION.md#required-validation-before-pushing), including
  `npm run lint:docs-freshness` before every push. Do not bypass the pre-push hook.
- Post review findings inline through the PR reviews API, with the overall summary in the review body. Use `REQUEST_CHANGES` for real bugs
  and `COMMENT` for observations; never auto-`APPROVE`. Explain the problem, impact and transferable principle; leave the rewrite to the
  author unless asked to implement it.
- Distinguish prepared work, implemented behaviour, executed tests, deployment and human acceptance. Keep unavailable evidence and required
  decisions visible. Perform only authorized merges, releases and deployments; required human Product/QA acceptance must be explicitly
  recorded by its validator.
