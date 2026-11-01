# Release Procedure and Automation

This guide owns release preparation, promotion, publication verification and post-release synchronization. The executable publication
behavior is defined in [release-pr.yml](../../.github/workflows/release-pr.yml). The workflow publishes repository artifacts; deployment and
contract upgrades require their own explicitly scoped work and evidence.

## Entry points and responsibilities

- Create the tracking issue from the [release issue template](../../.github/ISSUE_TEMPLATE/release.md), titled `[Release] vX.Y.Z`.
- Prepare the promotion PR using the [release PR template](../../.github/PULL_REQUEST_TEMPLATE/release.md), with the same `[Release] vX.Y.Z`
  title as its tracking issue.
- Follow [AGENTS.md](../../AGENTS.md) and the [GitHub flow skill](../../.agents/skills/cnc-github-flow/SKILL.md) for assignment, native
  hierarchy, Kanban fields, review and publication. Follow [commit conventions](../../.github/copilot-instructions/commit-conventions.md)
  for English commit and ordinary PR titles. Release issues and promotion PRs follow the
  [dedicated title rules](../../.agents/skills/cnc-github-flow/SKILL.md#sprint-goal-and-release-issue-titles), without a Conventional Commit
  type or gitmoji; release commits still use Conventional Commits, for example `chore: 🔧 prepare release vX.Y.Z`.

The issue records a release owner, independent technical reviewer, final release decision owner and applicable Product/QA validator. It
links the baseline, included deliveries, canonical expectations, validation, blockers and follow-up. Technical checks, human acceptance,
merge, tag/Release publication and deployment each need their own evidence.

## Prepare and validate

1. Search for an existing issue for the version. Otherwise use the release issue template, assign the delivery owner, attach the native
   parent and initialize the [Kanban fields](../development-guide/kanban-project.md). Read them back; a body reference alone does not attach
   the parent or Project card.
2. Choose the version and previous-release baseline. Record the baseline tag/SHA and inspected `develop` and `main` SHAs, included delivery
   issues/PRs, exclusions and compatibility or migration decisions. Confirm that the intended version tag is unused before promotion.
3. Create the repository-owned `release/vX.Y.Z` branch from the agreed, fetched `develop` revision. The `release/` prefix is required by the
   publication trigger; ordinary implementation branches use `feature/<slug>`. Review any release-specific version or changelog changes
   explicitly. The workflow does not update package versions or the committed changelog.
4. Run applicable checks from [AGENTS.md](../../AGENTS.md), including documentation freshness before pushing. Apply
   [Development Relationship Validation](../development-guide/relationship-validation.md) across the combined release and inspect affected
   consumers even when their files are unchanged. Reuse valid delivery evidence when guarantees and dependencies remain unchanged; target
   new validation at integration risks. Aggregation alone does not make relationships non-applicable.
5. Push the release branch and open a draft PR to `main` using the release PR template, the same `[Release] vX.Y.Z` title as its tracking
   issue, and a closing reference to that issue. For CLI publication, prepare a real multiline body file and pass `--body-file`; read the
   published body back. Record actual checks, exact head/base, review scope, limitations and required acceptance.
6. Before an authorized merge, recheck the exact PR head and current `main` revision, synchronization, required CI, unresolved review
   findings and required human decisions. Refresh evidence affected by intervening changes. A green source PR or a mergeable release PR
   alone does not establish release readiness.

Release approval is a human decision. This procedure and the automation do not grant permission to merge, deploy or upgrade contracts.

## Current publication workflow

The workflow runs when a PR targeting `main` is closed, but its job executes only when the PR was merged, its source belongs to the same
repository and the source branch starts with `release/`. Closing an unmerged PR, a fork source or another branch prefix does not publish a
release. The workflow uses Node.js 24, the automatic `GITHUB_TOKEN` and `contents: write`; no separate publication credential is configured.

| Order | Step                         | Actual behavior                                                                                                                                                        |
| ----- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Extract and validate version | Read the branch suffix, validate it and the numeric PR number, and normalize the version to a leading `v`.                                                             |
| 2     | Check tag                    | An existing version tag skips all subsequent tag, notes, Release, build and upload steps.                                                                              |
| 3     | Tag                          | Create and push an annotated version tag from the checked-out revision, with the source PR number in its message.                                                      |
| 4     | Notes and GitHub Release     | Generate notes from non-merge commits since the preceding reachable tag, then publish a non-draft Release. Without a preceding tag, the notes list at most 50 commits. |
| 5     | Builds and archives          | Install each component's dependencies, build/compile and package the app, backend, contracts and dashboard as described below.                                         |
| 6     | Upload and latest            | Attach matching archives; set latest only when the version contains none of `alpha`, `beta` or `rc`.                                                                   |

The tag and GitHub Release are created **before** builds and uploads. Their existence alone does not establish complete publication. The
workflow does not run the repository's lint, type-check, test or acceptance suites; pre-merge checks and review remain separate obligations.

### Version handling

Use `release/vX.Y.Z` as the branch convention. The current validator also accepts a suffix without `v` and normalizes it, for example
`release/0.7.2` → tag `v0.7.2`. It accepts three numeric core components with no leading zeroes and an optional hyphen-separated prerelease
suffix containing dot-separated alphanumeric/hyphen identifiers, such as `v1.0.0-rc.1`. Build metadata with `+` is rejected.

Prerelease classification is a separate, case-sensitive substring check for `alpha`, `beta` or `rc`. Other accepted suffixes are not
automatically marked prerelease. Review the expected Release classification when choosing a suffix rather than assuming full SemVer
classification.

### Artifact expectations and limits

| Expected archive                     | Current producer and limit                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `cnc-portal-app-vX.Y.Z.tar.gz`       | `app`: `npm run build`, archive `dist` contents. Build failure stops the step.                                                              |
| `cnc-portal-backend-vX.Y.Z.tar.gz`   | `backend`: attempt `npm run build`; archive `dist` and package metadata only if `dist` exists. Build failure is tolerated.                  |
| `cnc-portal-contracts-vX.Y.Z.tar.gz` | `contract`: `npm run compile`, archive `artifacts`, `cache` and `typechain-types`. Compilation or missing archive inputs can fail the step. |
| `cnc-portal-dashboard-vX.Y.Z.tar.gz` | `dashboard`: attempt `npm run build`; archive `.output` only if present. Build failure is tolerated.                                        |

Dependency installation failures still fail the build step. A successful workflow can omit backend or dashboard archives because their build
errors are tolerated. Verify the expected inventory, archive contents and relevant installation/build checks explicitly; a success
notification is not artifact validation. Indexer artifacts are not produced by this workflow.

### Failures and reruns

An invalid version fails before tagging. A later build or upload failure can leave an annotated tag and a published Release with incomplete
assets. Rerunning after the tag exists skips publication and artifact work; it does not repair the partial release. The existing-tag check
also does not validate the tag target or assets.

Record the failing run, actual tag target, Release state and missing artifacts on the release issue. Resolve recovery with the release owner
and link a bounded follow-up when needed. Do not delete or move a published tag as a routine retry. Changes to recovery behavior belong in a
separately reviewed workflow change.

## Verify publication and follow-up

1. Record the merged promotion PR and full merge SHA. Inspect the actual post-merge workflow result and failures.
2. Verify the annotated tag resolves to the intended released revision, then inspect the GitHub Release, notes, draft/prerelease/latest
   classification, asset inventory and archive contents. Record missing or unexecuted checks explicitly. Publication does not establish
   deployment, live smoke-test results, contract upgrades or Product/QA acceptance.
3. Compare fetched `main` and `develop`. If release-only changes remain, create a synchronization issue under the release issue and a linked
   PR from `main` to `develop`, using the standard templates and normal required checks/review. Verify the synchronization merge is
   reachable from `develop`. Otherwise record the compared revisions and why no synchronization is needed. Keep release-issue scope and
   Project status consistent with the remaining work.
4. Complete any explicitly in-scope operational validations and link separately owned follow-up for out-of-scope work. Close the release
   issue only when its own criteria and required decisions are satisfied. A promotion PR's closing keyword may close it on merge before
   post-merge work finishes; reassess and reopen it when required publication or follow-up evidence is still missing. Reconcile applicable
   Project fields and assess eligible parent closure under the GitHub flow contract.

Useful read-only checks, with the version and PR number replaced:

```bash
gh pr view <promotion-pr-number> --json state,mergedAt,mergeCommit,headRefOid,baseRefOid,statusCheckRollup
gh run list --workflow release-pr.yml --limit 10
gh run view <run-id> --log-failed
git fetch origin --tags
git rev-parse 'vX.Y.Z^{commit}'
gh release view vX.Y.Z --json tagName,targetCommitish,isDraft,isPrerelease,assets,url
git log origin/develop..origin/main --oneline
```

Inspect the real tag target rather than relying on Release metadata alone. Keep operational evidence free of infrastructure identifiers
under the repository's public-hygiene rules.
