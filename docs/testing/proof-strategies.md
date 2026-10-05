# Shared Proof Strategies

This is the canonical registry for `PS-*` identifiers in feature acceptance-criterion coverage tables. A strategy names one independently
assessable proof obligation. Feature READMEs select IDs from this registry; they do not redefine their meaning locally.

## Proof Strategy Reference

| Strategy                      | Proof Obligation             | Required Evidence | Proof Rationale                                                                                           |
| ----------------------------- | ---------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| `PS-FRONTEND`                 | Frontend rule                | Frontend          | A client-side rule, derivation, or state transition needs a focused frontend assertion.                   |
| `PS-BACKEND`                  | Backend rule                 | Backend           | An API rule, authorization decision, or persisted outcome needs a backend assertion.                      |
| `PS-CONTRACT`                 | Contract rule                | Contract          | An on-chain rule or state transition needs a contract assertion.                                          |
| `PS-DASHBOARD`                | Dashboard rule               | Dashboard         | A backoffice presentation or local interaction needs a dashboard assertion.                               |
| `PS-BROWSER`                  | Browser behavior             | Mocked browser    | A user interaction or controlled failure branch needs browser evidence with explicit mocked dependencies. |
| `PS-FRONTEND-INTEGRATED`      | Integrated client journey    | Integrated E2E    | Client behavior must work in the primary integrated browser journey, not only in isolation.               |
| `PS-API-INTEGRATED`           | Real API boundary            | Integrated E2E    | The browser/API hand-off and resulting user-visible state must work together.                             |
| `PS-CHAIN-INTEGRATED`         | Real chain boundary          | Integrated E2E    | A browser journey must use the real chain and observe the intended state or transaction outcome.          |
| `PS-FULL-STACK-INTEGRATED`    | Real API and chain boundary  | Integrated E2E    | Browser, API, and chain must jointly produce the observable outcome.                                      |
| `PS-DASHBOARD-INTEGRATED`     | Integrated dashboard journey | Integrated E2E    | A dashboard journey must produce the user-visible result through its real required dependencies.          |
| `PS-DASHBOARD-API-INTEGRATED` | Real dashboard/API boundary  | Integrated E2E    | A dashboard action must cross the real API boundary and show the resulting state.                         |

Several IDs on one acceptance criterion mean **all** listed obligations are required. Each ID has its own row and status; the criterion
counts as met only when every row is `✅ Met`. Choose proof obligations from the AC's actual owners and material boundaries, not every
technology used by its journey. If the backend owns a rule, authorization decision, or persisted outcome, require `PS-BACKEND`; if a
contract owns an on-chain rule or state transition, require `PS-CONTRACT`. An integrated test does not replace either focused test. A layer
that only transports data does not automatically own the AC.

For an AC with frontend-owned behavior, require `PS-FRONTEND` for an independently failing client rule, `PS-BROWSER` for a user interaction
or controlled error branch, or an integrated ID when the real hand-off is the behavior to prove. Do not automatically require a frontend
test for a backend-only or contract-only rule, or a unit test when the same frontend behavior is already fully proved at the appropriate
browser boundary. Add multiple IDs when distinct rules or boundaries can fail independently. Focused frontend and backend tests do not imply
`PS-API-INTEGRATED`; focused browser and contract tests do not imply `PS-CHAIN-INTEGRATED`.

`Current Evidence` lists every test type directly linked to the AC through representative `AC-US-*` references, even when that type does not
satisfy the strategy on the row. Repeat the same complete inventory on every row of a multi-strategy AC; use `None linked` only when the AC
has no direct references. Each row's status compares its own required evidence with that inventory. A static reference is not by itself an
assertion review or a passing-run report; keep a conservative `⚠️ Insufficient` or `🔎 Unverified` status when the linked assertion has not
established the full obligation. Latest executions belong in CI and test-run records. The
[Feature Documentation Guide](../platform/feature-specification-guide.md) owns the per-story table format and review rules.
