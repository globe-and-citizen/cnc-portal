# Documentation Freshness Policy

**Status:** Current

**Last updated:** 2026-08-23

**Purpose:** Keep current-behaviour documentation aligned with product and technical changes made by humans or AI agents

## Policy

Documentation is part of a behavioural change, not a follow-up task. Before editing a behavioural source, identify its
canonical documentation owner. In the same pull request, update that owner when the verified behaviour, journey, rules,
boundaries, failures, evidence, or validation state changes.

An AI agent performs this update as part of its implementation work. Continuous integration does not generate product
claims on the agent's behalf; it blocks a pull request when the required review and documentation update are absent.

## Enforced Scope

The [documentation freshness validator](../../scripts/validate-documentation-freshness.mjs) reads local source links and
backticked repository paths from canonical documents. It treats a linked file or directory as that document's declared
implementation evidence.

| Behavioural change                                                        | Canonical documentation owner                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Client journeys, components, composables, queries, stores, and routes     | `docs/features/**/README.md` or `Readme.md`                                  |
| Dashboard pages, components, queries, middleware, and stores              | `docs/features/backoffice/**/README.md`                                      |
| Backend controllers, routes, services, middleware, validation, and schema | The owning feature README or a shared capability README                      |
| Solidity contract behaviour                                               | `docs/contracts/features/**/README.md` and any linked product feature README |
| Shared client, dashboard, backend, indexer, or subgraph runtime           | `docs/implementation/**/README.md` and any linked feature README             |

Test-only changes are outside this gate. They still need the normal test review and may require a documentation change
when they reveal a user-visible rule or gap.

Markdown files are documentation, including when they are stored beneath a behavioural source root. They are not treated
as behavioural source code by this gate.

The current enforcement applies to the source roots listed above. Expand the validator's behavioural-source patterns
when a new runtime surface gains canonical documentation; do not bypass the check by removing an evidence link.

## Pull Request Contract

For every changed behavioural path, the validator requires both conditions below:

1. At least one canonical owner currently links that source file or directory as implementation evidence. A previously
   undocumented path therefore fails until the agent creates or completes the relevant documentation.
2. Every canonical document that owns the changed path is modified in the same pull request. This forces re-review of
   each product, contract, or implementation statement that could be stale.

Use precise Markdown links under the document's implementation evidence rather than copying source code. A directory
link is appropriate only when the whole directory belongs to the same documented behaviour. A source link without a
substantive documentation review is not sufficient: update the affected journey, rules, criteria, gap, or verification
state as the change requires.

## Agent Workflow

1. Classify the changed behaviour with the Feature or Implementation Documentation Guide.
2. Locate every canonical README that already links its source path.
3. Update the complete set of affected documents; add a new owner and inventory entry when none exists.
4. Run `npm run lint:docs-freshness` before handing over the change.
5. Run the relevant Markdown and subproject validations.

The validator is intentionally conservative: an unrelated refactor inside a documented directory still requires an
explicit documentation review. If the observable behaviour is unchanged, record that fact through the normal review
process while keeping the existing statements accurate.

## Validation

```bash
npm run test:docs-freshness
npm run lint:docs-freshness
npm run lint:md
npm run format:md:check
bash scripts/audit-doc-drift.sh
git diff --check
```
