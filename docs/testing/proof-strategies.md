# Shared Proof Strategies

This is the canonical registry for `PS-*` identifiers in feature acceptance-criterion coverage tables. A strategy names one independently
assessable proof obligation. Feature READMEs select IDs from this registry; they do not redefine their meaning locally.

## Proof Strategy Reference

| Strategy                      | Responsibilities              | Required Evidence | Proof Rationale                                                                                              |
| ----------------------------- | ----------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `PS-FRONTEND`                 | Frontend                      | Frontend          | A client-side rule, derivation, or state transition needs a focused frontend assertion.                      |
| `PS-BACKEND`                  | Backend                       | Backend           | An API rule, authorization decision, or persisted outcome needs a backend assertion.                         |
| `PS-CONTRACT`                 | Contract                      | Contract          | An on-chain rule or state transition needs a contract assertion.                                             |
| `PS-DASHBOARD`                | Dashboard                     | Dashboard         | A backoffice presentation or local interaction needs a dashboard assertion.                                  |
| `PS-BROWSER`                  | Frontend                      | Mocked browser    | A user interaction or controlled failure branch needs browser evidence with explicit mocked dependencies.    |
| `PS-FRONTEND-INTEGRATED`      | Frontend                      | Integrated E2E    | Client behavior must survive the real primary browser journey, including its relevant navigation and reload. |
| `PS-API-INTEGRATED`           | Frontend + Backend            | Integrated E2E    | The browser/API hand-off and its resulting persisted user-visible state must work together.                  |
| `PS-CHAIN-INTEGRATED`         | Frontend + Contract           | Integrated E2E    | A browser action must produce and observe the intended real-chain result.                                    |
| `PS-FULL-STACK-INTEGRATED`    | Frontend + Backend + Contract | Integrated E2E    | Browser, API, and chain must jointly produce the observable outcome.                                         |
| `PS-DASHBOARD-INTEGRATED`     | Dashboard                     | Integrated E2E    | A dashboard journey must produce the user-visible result through its real required dependencies.             |
| `PS-DASHBOARD-API-INTEGRATED` | Dashboard + Backend           | Integrated E2E    | A dashboard action must cross the real API boundary and show the resulting persisted state.                  |

Several IDs on one acceptance criterion mean **all** listed obligations are required. Each ID has its own row, current direct evidence, and
status; the criterion counts as met only when every row is `✅ Met`. `PS-FRONTEND` plus `PS-BACKEND` does not imply `PS-API-INTEGRATED`;
likewise, focused browser and contract tests do not imply `PS-CHAIN-INTEGRATED`. Add an integrated ID only when that boundary itself is
required and independently asserted.

`Current Evidence` is derived separately for each strategy row from direct representative `AC-US-*` references in classified tests. Show
matching labels, `Other linked: …` when references exist only in other layers, or `None linked` when the AC has no direct references. A
static reference is not by itself an assertion review or a passing-run report; keep a conservative `⚠️ Insufficient` or `🔎 Unverified`
status when the linked assertion has not established the full obligation. Latest executions belong in CI and test-run records. The
[Feature Documentation Guide](../platform/feature-specification-guide.md) owns the per-story table format and review rules.
