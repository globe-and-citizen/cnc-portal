# Autonomous Semantic Audit Contracts

**Status:** Experimental

**Scope:** Recurring AI-agent audits that require contextual reasoning beyond deterministic CI checks

This guide defines the contract for autonomous agents that inspect CNC Portal, publish an evidence-backed audit report, and remediate
confirmed findings through tracked draft pull requests. It defines the audit protocol only; scheduling, runners, credentials, and automated
GitHub mutations are not implemented yet.

## Purpose and Boundary

An autonomous semantic audit answers a question that cannot be reduced to a stable pass/fail command. It compares intent, implementation,
tests, runtime boundaries, and user-visible outcomes to identify contradictions or missing proof.

The following are inputs to an audit, not semantic audits by themselves:

- lint, formatting, type-check, build, and unit-test results;
- code-coverage percentages;
- dependency or secret-scanner output;
- static-analysis findings without contextual triage;
- missing files, identifiers, or generated artifacts detectable by a deterministic rule.

An agent may run those checks to gather evidence. A finding must additionally explain why the observed state violates a documented product,
security, architectural, economic, or operational expectation. When a recurring finding becomes fully deterministic, move its detection into
CI and keep the agent focused on whether the rule remains sufficient and correctly scoped.

## Context Authority

Scheduled agents must not depend on private conversation history. Durable context comes from the checked-out repository, in this order:

1. `AGENTS.md` and the applicable repository skill define execution and safety rules.
2. Canonical feature, contract, and implementation documentation defines intended current behaviour.
3. Source code and migrations define implemented behaviour.
4. Tests and runtime evidence show what has actually been exercised.
5. ADRs explain durable technical decisions and accepted trade-offs.
6. Open issues and pull requests provide current coordination context, but never override canonical behaviour documentation.

If these authorities conflict, the conflict is itself a finding. The agent must not silently choose the interpretation that makes
remediation easier.

## Autonomous Audit Lifecycle

Every audit run follows this sequence:

1. **Prepare** — start from the latest `origin/develop`, confirm a clean worktree, record the immutable base SHA, and load the relevant
   audit contract.
2. **Inspect** — read the complete scoped documentation, implementation, tests, and recent relevant changes. Use deterministic checks only
   as supporting evidence.
3. **Reason** — compare claimed behaviour with actual responsibility across frontend, backend, database, contracts, indexers, and user
   journeys as applicable.
4. **Reproduce** — reproduce high-impact findings when a safe local or disposable environment exists. Never mutate a developer-controlled or
   production environment to obtain proof.
5. **Report** — write the complete report to `reports/agent-audits/<audit-id>/<run-id>.md`. This path is ignored by Git; a future runner may
   publish it as a workflow artifact and summarize it in GitHub.
6. **Deduplicate** — fingerprint each finding and locate an existing open issue or remediation PR before creating another artifact.
7. **Classify** — assign severity, confidence, status, and remediation mode independently.
8. **Track** — create or update a GitHub issue for each confirmed finding that cannot be resolved in the same small remediation unit.
9. **Remediate** — for eligible findings, create an atomic branch and draft PR, run all required checks, push it, and monitor CI until it is
   green or the finding is reclassified.
10. **Close the run** — publish what was inspected, found, fixed, deferred, or blocked, with links to every issue and PR. Never equate a
    green PR with deployment or production validation.

## Finding Contract

Every finding must contain:

| Field         | Requirement                                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| `id`          | Stable fingerprint derived from audit, rule, scope, and affected behaviour      |
| `title`       | Concise statement of the contradiction or missing guarantee                     |
| `scope`       | Feature, capability, contract, layer, and affected user role                    |
| `expectation` | Canonical behaviour or principle that should hold                               |
| `observation` | What the agent verified in the current revision                                 |
| `evidence`    | Exact documentation, source, tests, runtime output, and revision inspected      |
| `impact`      | User, security, accounting, operational, or maintainability consequence         |
| `severity`    | `critical`, `high`, `medium`, or `low`                                          |
| `confidence`  | `high`, `medium`, or `low`, independent of severity                             |
| `status`      | `confirmed`, `needs-decision`, `accepted-risk`, `false-positive`, or `resolved` |
| `remediation` | `autonomous-pr`, `assisted-pr`, or `report-only`                                |
| `validation`  | Checks and observable outcomes required to prove the remediation                |

A file path, tool warning, code smell, missing test, or coverage percentage is not enough. The report must connect evidence to a concrete
guarantee and explain the failure mode.

## Severity and Confidence

Severity measures impact:

- **Critical:** plausible loss of funds, irreversible corruption, privilege escalation, secret exposure, or unsafe release/deployment.
- **High:** major user journey, authorization, accounting, or data-integrity guarantee can fail.
- **Medium:** bounded incorrect behaviour, recovery gap, misleading evidence, or material maintainability risk.
- **Low:** local inconsistency or clarity problem with limited direct impact.

Confidence measures proof quality:

- **High:** directly reproduced or proven by authoritative code and tests with no unresolved interpretation.
- **Medium:** strong evidence exists, but one product, operational, or environment assumption remains.
- **Low:** a plausible hypothesis requiring additional evidence.

Low-confidence observations remain in the report and must not generate remediation PRs.

## Remediation Modes

### Autonomous PR

The agent may create a draft PR without prior human input when all conditions hold:

- the finding is `confirmed` with high confidence;
- canonical expected behaviour is explicit;
- the change is reversible and scoped to the finding;
- no production data, deployed contract, secret, or external commitment is mutated;
- appropriate regression proof can be added;
- the complete repository validation contract can be run.

### Assisted PR

The agent may create a draft PR that makes its assumptions and unresolved decision visible when implementation evidence is strong but
product, security, accounting, UX, or operational judgement remains. The PR must not claim the finding is fully resolved and must identify
the human decision required.

### Report Only

The agent reports and may create an issue, but does not change implementation, when remediation involves production data, contract
deployment or upgrade, secret rotation, legal/privacy policy, accounting policy, release approval, destructive recovery, or unsupported
external state.

## GitHub Artifact Contract

Audit-created GitHub artifacts follow `AGENTS.md` and the `cnc-github-flow` skill:

- use Conventional Commit titles with the matching gitmoji;
- search for an existing issue before creating one;
- assign a new issue to the configured repository owner;
- create one atomic remediation unit per root cause;
- create a `feature/<slug>` branch from current `origin/develop`;
- link every PR with `Closes #N` or `Fixes #N`;
- open remediation PRs as drafts and never auto-merge during the experimental phase;
- do not publish infrastructure identifiers, credentials, private evidence, or raw production data;
- run local validations and `npm run lint:docs-freshness` before pushing;
- monitor required checks and update the report with the final CI state.

An audit report is not committed by default. The issue holds the durable finding and the PR holds the remediation. A committed baseline is
allowed only for reviewed false positives or accepted risks that a future agent needs to avoid rediscovering.

## Run Report Contract

Every report contains:

1. audit ID, run ID, base SHA, timestamp, scope, and agent version;
2. documents, source areas, tests, runtime evidence, and exclusions inspected;
3. summary by severity, confidence, status, and remediation mode;
4. one complete section per finding following the finding contract;
5. issues and PRs created, updated, reused, or intentionally omitted;
6. validations executed and their exact outcomes;
7. unresolved assumptions, environment limitations, and human decisions required;
8. comparison with the preceding run, including new, persistent, resolved, and reopened findings.

Passing deterministic checks must be reported as supporting evidence, never as proof that the semantic audit found no problem.

## Audit Catalogue

| Audit ID                     | Contract                                                          | Primary question                                                                                  | Initial cadence                                    | Autonomous remediation                                |
| ---------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `acceptance-proof`           | [Acceptance proof](./acceptance-proof.md)                         | Do representative tests actually prove the claimed US and AC outcomes?                            | Weekly and after feature test migrations           | Yes, for high-confidence test or mapping corrections  |
| `user-journey`               | [User journey](./user-journey.md)                                 | Do real actor paths remain coherent across success, failure, recovery, and persistence?           | Weekly by feature group                            | Yes, for explicit missing proof or recovery behaviour |
| `cross-layer-security`       | [Cross-layer security](./cross-layer-security.md)                 | Do authorization, validation, privacy, and failure rules agree across every responsible layer?    | Fortnightly and before security-sensitive releases | Usually assisted                                      |
| `accounting-consistency`     | [Accounting consistency](./accounting-consistency.md)             | Does economic activity remain correctly attributed from source evidence through every report?     | Monthly and after accounting changes               | Yes for technical defects; policy remains assisted    |
| `contract-economic-safety`   | [Contract economic safety](./contract-economic-safety.md)         | Does on-chain behaviour preserve documented roles, value flows, generations, and terminal states? | Monthly and before contract releases               | Usually assisted or report-only                       |
| `architecture-documentation` | [Architecture and documentation](./architecture-documentation.md) | Do responsibilities, abstractions, and documentation still describe the system that exists?       | Monthly                                            | Yes for high-confidence bounded corrections           |
| `operational-release-risk`   | [Operational and release risk](./operational-release-risk.md)     | Can the changed system be diagnosed, migrated, recovered, and released without hidden risk?       | Before every release and monthly                   | Partial; release approval remains human               |

## Experimental Rollout

New contracts begin in report-only mode. After at least two reviewed runs with acceptable precision, maintainers may enable issue creation.
Autonomous draft PRs require a further reviewed run demonstrating that the proposed remediation boundaries and validation steps are
reliable. Auto-merge is outside the experimental contract.
