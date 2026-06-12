# CNC Accounting

Functional specification and scoping for **CNC-as-a-company** financial statements (general ledger, income statement, balance sheet).

| Document | Description |
|----------|-------------|
| [functional-specification.md](./functional-specification.md) | Scope, data inventory, chart of accounts, booking rules, and phase-2 gaps |

**Tracking issues:** [#1887](https://github.com/globe-and-citizen/cnc-portal/issues/1887) (goal) · [#1890](https://github.com/globe-and-citizen/cnc-portal/issues/1890) (this spec)

**Implementation target:** `app/` — the main Vue 3 SPA ([#1887](https://github.com/globe-and-citizen/cnc-portal/issues/1887)).

**Architectural reference:** Polymarket wallet accounting in `dashboard/app/` (Sprint 15 — issues #1882–#1884) established the layered pipeline pattern; CNC accounting ports that pattern into `app/` with CNC-native data feeds.
