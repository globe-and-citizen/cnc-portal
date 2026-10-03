# Development Relationship Validation

## Purpose and ownership

Validate the relationships affected by a change across product expectations, implementation, contracts, accounting, user journeys, and
evidence. Each missing or inconsistent relationship produces a concrete completion proposal.

This guide owns the checklist and its workflow. [AGENTS.md](../../AGENTS.md) requires its execution. Product expectations remain in their
canonical feature READMEs; contract and shared-runtime rules remain with their existing owners. Link those authorities instead of copying
acceptance criteria or product delivery status into a checklist.

## Scope and applicability

Start from the issue's intended outcome and the actual diff. Identify producers, consumers, and independently observable results. Follow
affected relationships into other domains even when their files are unchanged.

Assess every checklist type below. For applicable types, create one result per concrete source, target, and guarantee; a type can have
several results. Record `not-applicable` with a specific reason when the relationship is irrelevant. Unknown applicability remains an
inspection task, not an exemption.

Documentation, test-only, refactoring, and internal quality changes still require an assessment. Use the issue's technical expectations and
affected owners without inventing product US/AC. A purely editorial change can justify grouped non-applicable types; it does not require
unrelated product or E2E execution. A test or documentation change that alters a behaviour or proof claim needs the relevant checks.

## Checklist catalogue

| Check  | Relationship                                                                          | Concrete validation                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| REL-01 | User story → acceptance criteria                                                      | Stable criteria describe the actor's result, business rules, and relevant failure outcomes.                                             |
| REL-02 | Acceptance criterion → implementation                                                 | Identified sources and responsible layers implement the promised observable guarantee.                                                  |
| REL-03 | Frontend action → API, persistence, or chain boundary                                 | Parameters, authorization, validation, durable confirmation, and failure handling agree across participating layers.                    |
| REL-04 | On-chain action → Solidity method and frontend ABI                                    | Method, arguments, permissions, asset policy, amounts, precision, fees, and generation match the contract behaviour.                    |
| REL-05 | Authoritative event or record → consuming read model                                  | Consumers preserve identity, generation, precision, completeness, retry, and duplicate-handling guarantees.                             |
| REL-06 | Economic operation → accounting rule and journal entry                                | Inclusion or exclusion, entry cardinality, debit/credit, accounts, fees, currency, and counterparty follow the canonical economic rule. |
| REL-07 | Journal entries → ledger, statements, drill-downs, and exports                        | Applicable projections preserve the same entries, totals, scope, precision, and completeness.                                           |
| REL-08 | Initiating story → receiving or dependent story                                       | Handoffs preserve each domain's observable result, including credited balance, availability, history, restrictions, and recovery.       |
| REL-09 | Shared capability or policy → affected consumers                                      | Every affected consumer preserves its own guarantee under the changed shared rule or interface.                                         |
| REL-10 | Acceptance criterion → representative proof                                           | The linked assertions prove the criterion in its responsible layer and required proof mode.                                             |
| REL-11 | Business journey → E2E path → executable scenario                                     | Story references, actions, boundaries, persisted outcomes, refresh, and relevant failure/recovery branches agree.                       |
| REL-12 | Changed implementation or proof claim → canonical documentation and reviewed revision | Owners and evidence claims describe the inspected version; execution results identify their actual revision and proof mode.             |

Use the [cross-domain relationship model](../platform/feature-specification-guide.md#cross-domain-story-relationships) to distinguish
handoffs, orchestration, shared policy, and derived projections. Accounting checks also use the
[Accounting rule catalogue](../features/accounting/journal-entry-catalogue.md), and journey checks use the
[E2E path catalogue](../testing/e2e-paths.md).

## Required workflow stages

### 1. Issue scoping, before implementation

- Read the issue, canonical expectations, existing implementation, and relevant evidence.
- Identify applicable checklist types, expected relationships, affected consumers, and the smallest sufficient validation plan.
- Record known missing relationships and proposed completions in the issue's relationship-validation plan. New features can have planned
  implementation and proof; do not represent them as validated before they exist.
- Identify product, accounting, or architectural decisions that are required before dependent work can proceed. Preserve the current
  authorization and issue-placement rules.

### 2. Implementation and review readiness

- Update the assessment after each logical change using the actual diff and discovered consumers.
- Reassess immediately when a public interface, contract method/event, shared policy, persistence schema, or accounting rule changes.
- Compare the linked guarantees with code and representative assertions, then run the scoped validation required by `AGENTS.md` and the
  owning proof strategies. Keep real, mocked, skipped, unavailable, and unexecuted evidence distinct.
- Complete the PR's relationship-validation section before requesting review. Draft PRs may expose pending results and completion proposals;
  they must not claim readiness while required guarantees remain unresolved.

### 3. Independent PR review

- The reviewer independently checks the issue, diff, canonical owners, relationship scope, and representative evidence. Author checkboxes
  and generated inventories are inputs, not proof of correctness.
- Challenge unsupported applicability exclusions, omitted consumers, stale evidence, and assertions that only touch adjacent behaviour.
- Include the relationship verdict in the review summary and post actionable code findings using the repository's inline review contract. A
  reviewer can be human or an agent; this guide does not authorize spawning agents or automatically approving a PR.

### 4. Final validation before merge

- Inspect the exact PR head and current target revision, synchronization, live required checks, and unresolved review findings.
- Reassess affected relationships after new commits, synchronization, or relevant upstream changes. Record the current head/base and the
  evidence reused or rerun; earlier evidence is reusable only when the relevant guarantee and dependencies remain unchanged.
- Resolve every required gap before merge. This stage validates readiness; it does not grant permission to merge or bypass branch
  protection.

For a release combining several changes, assess the affected cross-feature relationships together so individually validated PRs do not hide
integration drift. Do not rerun unrelated checks merely because the release contains more files.

## Result contract

The issue carries expected relationships and planned proof. The PR carries the actual result and evidence. Record the validation stage,
inspected head/base or working revision, scope, and canonical references alongside the result table.

| Field                     | Required content                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Check                     | Catalogue ID, such as `REL-06`.                                                                                                              |
| Source → target           | Exact identifiers or file/section references for this relationship.                                                                          |
| Guarantee / applicability | Expected observable result and why the check is required or non-applicable.                                                                  |
| Relationship              | `present`, `missing`, `invalid`, `unknown`, or `not-applicable`.                                                                             |
| Validation                | `validated`, `inconsistent`, `unverified`, `stale`, `unavailable`, or `not-applicable`.                                                      |
| Evidence                  | Sources/assertions inspected, proof mode, method, revision, and actual execution result or explicit limitation.                              |
| Completion proposal       | Gap, destination/owner, concrete next action, expected result, closure evidence, confidence, and unresolved decisions; `None` when complete. |

A present link can remain unverified or inconsistent. A passing identifier/reference check establishes structure; it does not prove
behaviour. `Validated` requires evidence appropriate to the stated guarantee. Code inspection can establish a responsibility or interface
fact; mandatory runtime proof still needs its actual execution.

Keep initial observations separate from confirmed findings. A missing reference does not prove a missing implementation. A known test
without a marker may provide adequate proof after inspection. A prepared dependency is not evidence that its user journey passed.

## Completion proposals and readiness

For each missing, invalid, unknown, inconsistent, stale, or unavailable required relation, propose a bounded next action. An unverified
required relation also needs its planned validation. Identify the exact source, expected target, canonical owner, observed gap, destination
file or artifact, and evidence needed to close it. Search existing implementation and proof before proposing additions; mark tentative
matches as candidates. Deduplicate proposals that share a root cause.

For example, if an economic operation is linked to its accounting mapper but lacks required integrated source-to-book evidence, preserve the
existing rule and propose the missing scenario and assertions. Validate the operation's identity, economic classification, expected entry
cardinality, balance, and reconstruction after refresh. Do not create another US/AC merely to repair a proof link.

A missing or inconsistent relationship necessary to the promised changed behaviour, an unresolved necessary decision, or unavailable
mandatory proof blocks review readiness and merge. Unrelated existing gaps stay separately visible unless they invalidate that behaviour. Do
not weaken a canonical expectation or change an accounting policy to make a check pass. Human product validation remains governed by the
[feature review contract](../platform/feature-specification-guide.md#human-review-contract).

## Existing checks and semantic review

Run the existing applicable checks: `lint:acceptance-traceability`, `report:acceptance-coverage`, `lint:docs-freshness`, and the normal
subproject validations. The report is a static inventory, not the latest passing run. The
[Documentation Freshness Policy](../platform/documentation-freshness-policy.md) still governs canonical ownership and reviewed source
attestations.

The [documentation CI workflow](../../.github/workflows/docs-drift.yml) enforces existing deterministic traceability, formatting, and
freshness rules. It does not validate this result table or generate semantic completion proposals. Agents perform this checklist explicitly
and record their evidence. Use the [semantic audit contracts](./autonomous-audits/README.md) for deeper acceptance, journey, accounting,
security, and architecture audits when required by the change; a new autonomous remediation mandate is not implied.
