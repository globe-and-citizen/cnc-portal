# CNC Accounting

Treat the CNC as a **company** and keep its books: general ledger, income statement, and balance
sheet.

This folder catalogues **every way money moves** across the CNC contracts, maps each one to a
journal entry, and runs a **full worked example** end to end so the numbers can be trusted.

| Document                                                         | What's inside                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [money-flow-catalogue.md](./money-flow-catalogue.md)             | Glossary · the CNC entity · contracts that move money · every monetary interaction · use-case → journal-entry mapping · chart of accounts · a full worked example (general ledger → T-accounts → trial balance → income statement → balance sheet) |
| [cnc-accounting-spec.md](./cnc-accounting-spec.md)               | Phase 1 scope & spec · reusing the Sprint 15 pipeline · inventory of the on-chain + portal data we already have · source → statement-line mapping · how fees and expenses (Ponder/payroll/debt) are booked · the gaps to close in phase 2          |
| [contract-migration-history.md](./contract-migration-history.md) | Keeping the books across contract migrations · user stories + tester checklist · manual verification steps · known limitations ([#2456](https://github.com/globe-and-citizen/cnc-portal/issues/2456))                                              |

**Tracking:** [#1887](https://github.com/globe-and-citizen/cnc-portal/issues/1887) (goal) ·
[#2078](https://github.com/globe-and-citizen/cnc-portal/issues/2078) (sprint plan) ·
[#2126](https://github.com/globe-and-citizen/cnc-portal/issues/2126) (catalogue) ·
[#1890](https://github.com/globe-and-citizen/cnc-portal/issues/1890) (this spec).

### At a glance

- **Contracts in scope:** Bank, FeeCollector, CashRemunerationEIP712, ExpenseAccountEIP712,
  InvestorV1, SafeDepositRouter — the contracts the CNC actually uses.
- **Key rules:** payroll is **accrual** (via a `Wage Payable` liability); expenses are **cash
  basis**; investing returns **SHER shares** booked to `Investor Equity`; a direct mint with nothing
  behind it is **memo only** (tracked in shares, not value); each team books CNC usage fees as an
  expense, while the global FeeCollector books the same payments as protocol-fee revenue.
- **Bank/Safe deposits and withdrawals** are booked from address inference by default, but a team
  owner can **manually classify** each one into a supported accounting category (revenue, an expense
  — operating/payroll/interest/dividend, owner capital, or a shareholder loan) — persisted, shared,
  and reversible; see catalogue §5.5
  ([#2457](https://github.com/globe-and-citizen/cnc-portal/issues/2457)).
- **The books balance at every level:** journal, trial balance, and `Assets = Liabilities + Equity`.
