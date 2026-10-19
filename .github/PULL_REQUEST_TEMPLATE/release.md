# Summary

Promote `release/vX.Y.Z` to `main` as the next repository release line.

This release branch contains the current development line after `vPREVIOUS`, with `<commit-count>` commits and `<changed-file-count>`
changed files. The PR is an aggregate release boundary; feature-level implementation and product evidence remain owned by their source
commits and canonical documentation.

## Tracking issue

Closes #<issue-number>

## Validation

- [ ] Relevant repository-level automated checks passed locally; list the exact checks and revision below.
- [ ] Documentation freshness was checked for every behavioural change.
- [ ] Manual validation limitation is recorded below.

## Relationship validation

This is an aggregate release promotion. No new behavioural source/target relationship is introduced by the release boundary itself;
feature-level relationships remain owned by their source issues and PRs.

**Stage / inspected revision:** <pre-merge review stage, release head, and target revision>

**Scope / canonical expectations:** Release promotion only; feature-level expectations remain in the canonical documentation and delivery
PRs.

**Affected consumers:** None introduced by this release boundary; the promoted consumers are the already-delivered feature surfaces included
in the release branch.

**Required gaps / decisions:** None for the aggregate boundary, or list the release-blocking decision.

**Separate existing gaps:** <tracked gaps that remain outside this promotion, or None>

## UI/UX Reviewer Journey

- [ ] `none` — no new user-facing visual or interaction change is introduced by the release aggregation itself; feature-level journeys
      remain owned by their source PRs.

## Review notes

- Source branch: `release/vX.Y.Z` → `main`.
- Base branch current state: <main revision or release reference>.
- Release tagging, deployment, and production verification are intentionally outside this PR and must follow the repository release
  procedure after merge.
- <Additional validation limitations, follow-up issues, or reviewer attention points.>
