# Contracts changelog

One section per upgradeable contract. Bump per [semver for contracts](UPGRADE_STRATEGY.md#3-version-tracking):
**patch** = bugfix only, **minor** = added API or appended storage, **major** = breaking (redeploy).

Each entry should answer:

1. What changed (1 sentence)
2. Storage impact (`none` / `appended N slot(s)` / `breaking`)
3. How it was shipped (`upgrade in place` / `redeploy + migration`)
4. Deployment date + networks

---

## Template (copy for new entries)

```
### ContractName X.Y.Z — YYYY-MM-DD
- What: <1 sentence>
- Storage: none | appended <N> slot(s) | breaking
- Shipped via: upgrade in place | redeploy + migration (link to script)
- Networks: polygon, sepolia, ...
```

---

## InvestorV1

<!-- Add entries above this line, newest first -->

## Officer

<!-- Add entries above this line, newest first -->

## Bank

<!-- Add entries above this line, newest first -->

## BoardOfDirectors

<!-- Add entries above this line, newest first -->

## CashRemunerationEIP712

### CashRemunerationEIP712 2.0.1 — unreleased
- What: use SafeERC20 for salary payouts and treasury token withdrawals.
- Storage: none.
- Shipped via: pending upgrade in place.
- Networks: not deployed.

<!-- Add entries above this line, newest first -->

## ExpenseAccountEIP712

### ExpenseAccountEIP712 2.0.1 — unreleased
- What: use SafeERC20 for expense payouts, deposits, and treasury token withdrawals.
- Storage: none.
- Shipped via: pending upgrade in place.
- Networks: not deployed.

<!-- Add entries above this line, newest first -->

## FeeCollector

<!-- Add entries above this line, newest first -->

## SafeDepositRouter

<!-- Add entries above this line, newest first -->

## Voting

<!-- Add entries above this line, newest first -->

## Elections

<!-- Add entries above this line, newest first -->

## Proposals

<!-- Add entries above this line, newest first -->

## Tips

<!-- Add entries above this line, newest first -->

## Vesting

<!-- Add entries above this line, newest first -->
