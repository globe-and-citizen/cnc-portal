# CNC Portal Roadmap

**Planning owner:** Product Team

**Last documentation update:** 2026-10-08

This roadmap names the outcomes CNC Portal is considering beyond individual delivery issues. The
[Sprint plan](https://github.com/globe-and-citizen/cnc-portal/issues/2905) owns current commitments; unscheduled outcomes below require a
Product decision before they enter a Sprint. Dates, effort, and completion claims belong with the approved plan and its evidence.

## Current focus

Sprint 20 focuses on extending integrated user-journey evidence, making Accounting more reliable, defining the trading bot's Accounting
plan, and clarifying the covered-call bot's existing behaviour and intended algorithm. The
[Sprint 20 plan](https://github.com/globe-and-citizen/cnc-portal/issues/2905) records owners and the exact expected outcomes. Corrective
work is tracked separately under its [Sprint Goal](https://github.com/globe-and-citizen/cnc-portal/issues/2908).

## Candidate next outcomes

| Outcome                                                    | Decision before scheduling                                                                                        | Planning reference                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trustworthy company books across direct treasury movements | Review the product rules, then select bounded discovery, classification, and reconciliation slices.               | [Accounting plan](https://github.com/globe-and-citizen/cnc-portal/issues/2878)                                                                              |
| Verifiable Safe and Expense Account journeys               | Prove the complete Safe service flow and scope the separate Expense authorization and spending fixes.             | [Safe validation](https://github.com/globe-and-citizen/cnc-portal/issues/2871), [Expense plan](https://github.com/globe-and-citizen/cnc-portal/issues/2881) |
| Release readiness                                          | Reassess open security findings and define the quality, deployment, and operational gates for a specific release. | [Security follow-ups](https://github.com/globe-and-citizen/cnc-portal/issues/1988)                                                                          |

Longer-term themes from the previous roadmap, including broader backoffice capabilities, governance, onboarding, and company documents, need
fresh Product scoping before they become commitments.

## Where progress is recorded

- [Product feature documentation](./features/README.md) owns current user journeys, acceptance criteria, gaps, and human validation.
- [Contract](./contracts/features/README.md) and [implementation](./implementation/README.md) documentation own their technical behaviour.
- [E2E business paths](./testing/e2e-paths.md) identify intended and linked journey evidence; actual execution belongs in test reports and
  CI.
- [GitHub issues and pull requests](https://github.com/globe-and-citizen/cnc-portal/issues) own delivery plans, ownership, decisions, and
  completion evidence.

Review this roadmap when Product changes the order or scope of outcomes. Agents may prepare source-backed updates; Product approves
strategic commitments.
