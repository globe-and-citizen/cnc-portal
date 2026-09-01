# Contract Behaviour Index

**Documentation state:** Existing contract references; verification remains contract-specific

**Last updated:** 2026-08-21

Contract behaviour is an implementation boundary, not a product feature inventory. Product actors, journeys, and human-reviewed acceptance
criteria remain under [`docs/features/`](../../features/README.md). The documents below predate the current documentation model unless they
state a recent `Last verified` date; their historical story counts and checkboxes are not evidence of current product validation.

## Contract References

| Contract                                             | Responsibility                                     |
| ---------------------------------------------------- | -------------------------------------------------- |
| [Officer](./officer/README.md)                       | Deploy and orchestrate team contracts              |
| [Bank](./bank/README.md)                             | Hold treasury funds and distribute dividends       |
| [InvestorV1](./investor-v1/README.md)                | Issue and track equity tokens                      |
| [Elections](./elections/README.md)                   | Run formal board elections                         |
| [BoardOfDirectors](./board-of-directors/README.md)   | Govern board decisions                             |
| [Proposals](./proposals/README.md)                   | Create and vote on board proposals                 |
| [ExpenseAccount](./expense-account/README.md)        | Settle signed expense budgets                      |
| [CashRemuneration](./cash-remuneration/README.md)    | Settle signed wage claims                          |
| [Vesting](./vesting/README.md)                       | Accrue and mint scheduled share grants             |
| [FeeCollector](./fee-collector/README.md)            | Collect configured protocol fees                   |
| [SafeDepositRouter](./safe-deposit-router/README.md) | Route deposits into equity tokens                  |
| [AdCampaignManager](./ad-campaign-manager/README.md) | Fund campaigns and settle click payouts            |
| [Voting](./voting/README.md)                         | Execute directive and election voting              |
| [Infrastructure](./infrastructure/README.md)         | Provide beacon and proxy deployment infrastructure |

## Further Reading

- [Contract Overview](../README.md) — function signatures and contract list
- [Technical Architecture](../contracts-technical-architecture.md) — patterns, data flows, upgrade mechanics
- [Architecture Diagrams](../contracts-architecture-diagram.md) — Mermaid diagrams
- [Quick Reference](../contracts-quick-reference.md) — function signatures, events, error codes
