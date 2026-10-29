# Code Audits and Finding Follow-up

## Purpose and Authority

Use this contract for a requested audit of the current repository or a bounded folder, and when resuming the decisions or corrections of a
previous audit. The [code-audit skill](../../.agents/skills/cnc-code-audit/SKILL.md) owns execution; this guide owns the report, correction
proposal, and follow-up contract. A pull-request review uses the [PR-review skill](../../.agents/skills/cnc-pr-review/SKILL.md).

An audit request authorizes inspection and local reporting. It does not itself request implementation, GitHub publication, scheduling,
merging, deployment, or signing. Apply existing session authorization when the user also requests tracking or correction; do not request it
again. The [recurring audit contracts](./autonomous-audits/README.md) retain their own lifecycle and rollout boundaries. Reusing this report
contract does not enable their autonomous actions.

Canonical feature and implementation documents own intended behaviour. Source, consumers and representative tests establish the current
guarantees. Audit reports describe evidence and proposals; they do not replace those authorities or grant product acceptance.

## Establish the Audit

Record the requested objective, paths, exclusions, branch, immutable revision, relevant local changes, and inspection date. Use the
requested checkout; do not silently switch to another branch or discard a dirty working tree. For uncommitted audited sources, preserve
their patch or content fingerprint with the local evidence so another reviewer can identify the exact state examined.

Inventory the scope before selecting deep reads. Exclude generated/vendor material from maintainability metrics, but inspect handwritten
adapters and registries even when they live beside generated files. Report inventory, files read in depth, automated searches and remaining
limits separately. Follow consumers within scope; make an uninspected external boundary explicit instead of claiming end-to-end proof.

Use the area's canonical guides for naming, responsibilities, state ownership, reactive behaviour, types, effects, formatting and tests.
Check abstractions, meaningful duplication, coupling, complexity and dead paths against actual production use. Size, a single consumer,
`any`, watchers, complexity scores and a green check are discovery signals, not self-sufficient findings.

## Finding Contract

Each case keeps the same identity across report revisions, decisions, implementation and verification. Preserve existing IDs, such as
`CC-01`, when continuing an audit. Match previous findings by root cause, responsibility and affected guarantee; line-number movement is not
a new case. Group occurrences of the same cause and retain links to each affected consumer.

Every confirmed finding contains:

| Field                  | Required content                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity               | Stable case ID, concise title and existing tracking links.                                                                                              |
| Evidence               | Inspected revision/local fingerprint, exact paths and lines, production consumers, representative assertions and observed result.                       |
| Expectation and impact | Intended guarantee, concrete failure or maintenance cost, and the reusable principle. Distinguish a reproduced failure from a code-derived consequence. |
| Classification         | Priority with a reason, severity, confidence, and finding status. Use the recurring contract's severity/confidence definitions.                         |
| Correction proposal    | Concrete changes, affected owners/files, expected result, constraints and relevant trade-offs, as specified below.                                      |
| Validation             | Observable outcomes and appropriate checks that would establish the correction, including the missing regression scenario when relevant.                |
| Follow-up              | Decision, delivery progress, owner, next action, blockers, dated evidence, issue/PR links and append-only history.                                      |

Unconfirmed observations retain the evidence gap and the next investigation; do not invent a definitive fix to make the report appear
complete. For a confirmed case requiring a business or architectural decision, propose the viable options, explain their consequences, and
identify the decision needed before implementation.

### Correction Proposal

The recommendation must let a maintainer scope the next change without rediscovering the diagnosis. State:

1. What to change and which existing module should own the responsibility or rule.
2. Which producers, consumers, types, tests and canonical documentation need to change together.
3. The expected behaviour after correction and the guarantees to preserve.
4. The smallest useful validation, including a concrete input/outcome for a behavioural defect.
5. Any meaningful trade-off, prerequisite or unresolved choice; distinguish your recommendation from an accepted decision.

For example, “centralize validation” is incomplete. Identify the existing validator owner, the precision rule to enforce before conversion,
the input paths that should consume it, and an excess-precision example that must fail without changing valid inputs.

An audit does not need to write replacement source code to give an actionable solution. Avoid speculative frameworks, broad rewrites,
automatic extraction by line count, and estimates presented as verified facts. A recommendation may be to remove dead code, preserve a
justified boundary, or accept a documented trade-off.

### Priority Legend

Priority orders work; severity describes impact; confidence describes evidence quality; effort describes implementation cost. Do not derive
one automatically from another. Use an established project priority scale when one is supplied; otherwise state this scale in the report:

| Priority | Meaning                                                                    | Treatment                                                                    |
| -------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| P0       | Critical, immediate harm or a complete blocker.                            | Interrupt ordinary work for containment and correction.                      |
| P1       | Serious risk or a major journey/guarantee failing.                         | Address promptly, before the affected release or commitment when applicable. |
| P2       | Bounded incorrect behaviour, recovery gap or material maintenance risk.    | Plan a scoped correction.                                                    |
| P3       | Local clarity or consistency improvement with limited demonstrated impact. | Schedule when useful.                                                        |

Do not lower a finding's impact merely because it is hard to reproduce, or raise it merely because its code is long. Record uncertain impact
assumptions and confidence separately. A finding count is not a quality score or a required quota.

## Decision and Correction Tracking

Maintain a current summary and dated case history, not only a static diagnostic report. A row has separate fields for decision, delivery and
validation. A closed issue or merged PR does not automatically establish that the observed defect was corrected or accepted.

### Decisions

Record `pending`, `fix-as-proposed`, `fix-alternative`, `deferred`, `risk-accepted`, or `rejected`. Attach the actual choice, rationale,
actor, date, and source of authority. The actor can be the user, a maintainer, or an agent acting within a recorded mandate; never invent
human approval. An agent's proposed solution starts as a recommendation, not a user decision.

- For `fix-alternative`, retain the original proposal and record the selected alternative and its consequences.
- For `deferred`, record why, the owner and a review date or concrete revisit trigger when known; otherwise show what remains undecided.
- For `risk-accepted`, retain the impact and limits with the accepting authority. This is not a correction.
- For `rejected`, record the evidence that invalidates the finding. This is not an implemented fix.

### Delivery and Validation

Delivery states are `not-planned`, `planned`, `in-progress`, `in-review`, `integrated`, and `verified`. Show a blocker independently so it
does not erase the last verified stage. Allow direct transitions when evidence supports them; do not invent intermediate events. Cases
closed by rejection or risk acceptance may remain `not-planned` and carry their distinct closure disposition.

- `planned` identifies an owner and next action; an approved intention alone is not work in progress.
- `in-progress` and `in-review` require actual implementation/review evidence, not an elapsed date or optimistic checklist.
- `integrated` identifies the incorporated revision and relevant checks. It does not imply deployment, a demonstrated journey or acceptance.
- `verified` requires evidence for the finding's expected corrected result on the incorporated revision. Reuse earlier proof only when its
  guarantee and dependencies remain applicable. Include deployment, demonstration or Product/QA acceptance only where the owning contract
  requires them, and track those facts separately.

The validation field states what was checked, the revision, result, proof mode, date and what remains missing. Keep passed, failed, skipped,
unexecuted and unavailable checks distinct. An accepted correction can remain unverified; a fixed technical defect can still await a
required human acceptance. An issue closure is durable coordination evidence, not a substitute for these proofs.

Preserve the finding's diagnostic status from the recurring contract: `confirmed`, `needs-decision`, `accepted-risk`, `false-positive`, or
`resolved`. `resolved` requires correction verification; accepted risks and rejected findings keep their own dispositions. A later
regression reopens the same case with new evidence and a history event.

### Where the State Lives

For a local audit, use `reports/code-audits/<audit-id>/<run-id>.md` for the inspected snapshot and
`reports/code-audits/<audit-id>/tracking.md` for the current case register, unless the user supplied an existing report/location. Preserve
existing reports and IDs. These paths are ignored by Git and are local artifacts, not team-visible publication.

The run report owns the diagnosis and correction proposal. The register links to those details and owns the current choice, progress and
history. Keep the output proportional to the scope; summarize repeated evidence instead of duplicating the full narrative in both files.

When GitHub tracking is authorized, use the [GitHub flow](../../.agents/skills/cnc-github-flow/SKILL.md), preferably through `gh`. Search
for existing work first; create one issue per independent remediation unit, allowing several cases to share an issue when the root cause and
correction genuinely coincide. Preserve the required native parent, assignment and templates. Reference stable case IDs in the issue and
link its PR; recording a decision must not silently rewrite product acceptance criteria.

Once linked, the issue/PR and recorded decisions are authoritative for coordination; the local register is a dated summary of their last
readback. Refresh their actual state before reporting progress. If access is unavailable, label the last verified state and timestamp as
stale/unchecked rather than guessing or claiming synchronization. Do not let a local table become a second competing source of truth.

When a correction is requested, apply the affected area's implementation skill and validation rules, carry the stable case ID into its
tracking evidence, and update this register as part of that work. Do not limit follow-up to later audit runs or mark unrelated cases
complete because one shared PR merged.

Each history event records date, actor, changed field, previous/new value, rationale and evidence link or revision. Append transitions and
superseding decisions; do not erase earlier choices or automatically purge completed cases. A meaningful change outside the audited scope
requires fresh evidence before reopening or closing the case.

A compact register can use the following columns, with details and history under each stable case ID:

| Case  | Priority | Decision | Delivery    | Validation   | Owner / next action               | Issue / PR    | Last checked    |
| ----- | -------- | -------- | ----------- | ------------ | --------------------------------- | ------------- | --------------- |
| CC-01 | P2       | pending  | not-planned | Not executed | Unassigned; choose the correction | Not published | Inspection date |

## Report and Completion

A run report includes the inspected state and coverage limits, prioritized cases with complete correction proposals, the priority legend,
checks and their exact outcomes, rejected candidates, unresolved choices, and a link to the current register. On a follow-up, explain what
changed since the previous run and preserve the historical snapshot.

Before delivering, verify that:

- every confirmed finding has a bounded recommendation and validation plan, or explicit options and a decision prerequisite;
- consumers and documentation affected by the proposed change are identified, with inspection limits visible;
- decision, delivery and proof states agree with the actual evidence and are not inferred from each other;
- IDs, links, summary counts, rejected candidates, remaining work and history are consistent;
- a no-findings report states what was inspected and its limits instead of claiming universal cleanliness.

Completing an audit means its requested report and follow-up register are usable. It does not complete the corrections. Update the local
planning scratchpad accordingly without turning unapproved proposals into implementation commitments.
