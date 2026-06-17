# CNC Accounting

Treat the CNC as a **company** and keep its books: general ledger, income statement, and balance sheet.

This folder catalogues **every way money moves** across the CNC contracts, maps each one to a journal entry, and runs a **full worked example** end to end so the numbers can be trusted.

| Document | What's inside |
|----------|---------------|
| [money-flow-catalogue.md](./money-flow-catalogue.md) | Glossary · the CNC entity · contracts that move money · every monetary interaction · use-case → journal-entry mapping · chart of accounts · a full worked example (general ledger → T-accounts → trial balance → income statement → balance sheet) |

**Tracking:** [#1887](https://github.com/globe-and-citizen/cnc-portal/issues/1887) (goal) · [#2126](https://github.com/globe-and-citizen/cnc-portal/issues/2126) (this catalogue).

### At a glance

- **Contracts in scope:** Bank, FeeCollector, CashRemunerationEIP712, ExpenseAccountEIP712, InvestorV1, SafeDepositRouter — the contracts the CNC actually uses.
- **Key rules:** payroll is **accrual** (via a `Wage Payable` liability); expenses are **cash basis**; investing returns **SHER shares** booked to `Investor Equity`; a direct mint with nothing behind it is **memo only** (tracked in shares, not value); fees between Bank and FeeCollector are **internal** moves.
- **The books balance at every level:** journal, trial balance, and `Assets = Liabilities + Equity`.
