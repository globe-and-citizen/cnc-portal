# Documentation Freshness Policy

**Status:** Current

**Last updated:** 2026-08-30

**Purpose:** Keep current-behaviour documentation aligned with product and technical changes made by humans or AI agents

## Policy

Documentation is part of a behavioural change, not a follow-up task. Before editing a behavioural source, identify its canonical
documentation owner. In the same pull request, update that owner when the verified behaviour, journey, rules, boundaries, failures,
evidence, or validation state changes.

An AI agent performs this update as part of its implementation work. Continuous integration does not generate product claims on the agent's
behalf; it blocks a pull request when the required review and documentation update are absent.

## Enforced Scope

The [documentation freshness validator](../../scripts/validate-documentation-freshness.mjs) reads local source links and backticked
repository paths from canonical documents. It treats a linked file or directory as that document's declared implementation evidence.

| Behavioural change                                                        | Canonical documentation owner                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Client journeys, components, composables, queries, stores, and routes     | `docs/features/**/README.md` or `Readme.md`                                  |
| Dashboard pages, components, queries, middleware, and stores              | `docs/features/backoffice/**/README.md`                                      |
| Backend controllers, routes, services, middleware, validation, and schema | The owning feature README or a shared capability README                      |
| Solidity contract behaviour                                               | `docs/contracts/features/**/README.md` and any linked product feature README |
| Shared client, dashboard, backend, indexer, or subgraph runtime           | `docs/implementation/**/README.md` and any linked feature README             |

Test-only changes are outside this gate. They still need the normal test review and may require a documentation change when they reveal a
user-visible rule or gap.

Markdown files are documentation, including when they are stored beneath a behavioural source root. They are not treated as behavioural
source code by this gate.

The current enforcement applies to the source roots listed above. Expand the validator's behavioural-source patterns when a new runtime
surface gains canonical documentation; do not bypass the check by removing an evidence link.

Deleted sources are excluded from the automated ownership check because a canonical document cannot truthfully link to code that is no
longer present. When removing a source changes a documented journey, replace its evidence with the current implementation and update the
owning document in the same pull request.

## Pull Request Contract

For every changed behavioural path, the validator requires both conditions below:

1. At least one canonical owner currently links that source file or directory as implementation evidence. A previously undocumented path
   therefore fails until the agent creates or completes the relevant documentation.
2. Every canonical document that owns the changed path carries a current implementation-evidence attestation:

   ```markdown
   **Implementation evidence reviewed against:** `<full immutable commit SHA>`
   ```

   The SHA must resolve to a commit reachable from `HEAD`, and the changed source must be unchanged from that revision through the current
   staged and unstaged worktree. The attestation is a technical record that the evidence was reviewed against that exact source revision; it
   is not a release marker or a replacement for a feature's `Last reviewed` human-validation date.

Use precise Markdown links under the document's implementation evidence rather than copying source code. A directory link is appropriate
only when the whole directory belongs to the same documented behaviour. Update the affected journey, rules, criteria, gap, or verification
state when behaviour changes. When those statements remain current, refresh only the attestation; do not add review-history prose to a
product README merely to satisfy the validator.

## Agent Workflow

1. Classify the changed behaviour with the Feature or Implementation Documentation Guide.
2. Locate every canonical README that already links its source path.
3. Commit the behavioural source and its tests, then review every owning README against that immutable revision.
4. Update each affected document's current-behaviour statements only when they are stale, and set its implementation-evidence attestation to
   the reviewed source revision. Add a new owner and inventory entry when none exists.
5. Run `npm run lint:docs-freshness` before every GitHub push. The Husky pre-push hook repeats this validation and blocks stale changes; it
   complements, but does not replace, the pull-request gate.
6. Run the relevant Markdown and subproject validations.

The validator is intentionally conservative: an unrelated refactor inside a documented directory still requires an explicit documentation
review. It excludes only pure source relocations or renames and the matching local import, component-identifier, or static-asset-reference
updates needed to preserve the same targets; these changes leave the documented runtime behaviour unchanged. If the observable behaviour is
unchanged for any other change, record that fact through the normal review process while keeping the existing statements accurate.

## Validation

```bash
npm run test:docs-freshness
npm run lint:docs-freshness
npm run lint:md
npm run format:md:check
bash scripts/audit-doc-drift.sh
git diff --check
```
