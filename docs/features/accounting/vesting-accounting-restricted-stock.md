# Share Vesting Accounting — Restricted-Stock grant on the SHER structure

**Status:** 📝 Proposal — target use case\
**Changes vs. today:** the grant (`UC-VEST-01`) stops being memo-only and books a real entry; release and stop settle it. Everything stays
**off the income statement**, on the existing SHER accounts.

This use case combines the **Restricted-Stock grant** from the
[WallStreetPrep _Restricted Stock Journal Entry Example_](https://www.wallstreetprep.com/knowledge/stock-based-compensation-sbc/) — an entry
is booked **the moment the vesting is defined** — with the **SHER accounting structure** already used for wages paid in shares (issue
#2458): the compensation is a non-cash **equity** transaction and never touches the income statement.

## Why this is the right fit

The article records the award at grant because, in its example, the shares are legally **issued at grant** (`Common Stock & APIC` rises
immediately) and a contra-equity account offsets them until they are earned. The CNC's SHER wage cycle already works exactly this way — only
the account names differ:

| Article (restricted stock)     | CNC SHER structure                        |
| ------------------------------ | ----------------------------------------- |
| Contra-equity — Unearned Comp. | `Deferred SHER Compensation` (contra)     |
| Common Stock & APIC (issued)   | `Investor Equity` (minted shares)         |
| —                              | `SHERS To Be Issued` (promised, unminted) |

The one adaptation: the `Vesting` contract mints **nothing** at grant ([`Vesting.sol`](../../../contract/contracts/Vesting.sol) —
_"agreement only, no tokens move when it is created"_), so the grant credits the interim **`SHERS To Be Issued`** instead of
`Investor Equity`. `Investor Equity` — which must equal the on-chain SHER supply — is credited only at the **actual mint** (release/stop).
This is precisely the SHER wage lifecycle (accrue → settle), with the **grant playing the role of the accrual, booked upfront for the whole
award** (the restricted-stock part).

## User story

**As a** team owner\
**I want** a vesting schedule to be recorded in the books the moment it is defined, and settled as shares are released, entirely within
equity\
**So that** the committed share compensation is visible from day one, without ever touching the team's profit — consistent with how wages
paid in shares are booked.

## Actions and journal entries

**IS** = income statement, **BS** = balance sheet. Amounts follow the SHER rate of record, like the wage legs.

| Use case       | Action                     | Trigger                          | Journal entry                                                                                                                                                           | Effect                                                             |
| -------------- | -------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **UC-VEST-01** | **Define vesting** (grant) | `VestingCreated`                 | Dr Deferred SHER Compensation · Cr SHERS To Be Issued (**full award**)                                                                                                  | BS: equity ↑↓, net **0**; no IS — full award booked, unminted      |
| **UC-VEST-02** | **Release** (mint vested)  | `TokensReleased`                 | Dr SHERS To Be Issued · Cr Investor Equity (released amount)                                                                                                            | BS: committed → issued; `Investor Equity` = on-chain supply; no IS |
| **UC-VEST-03** | **Pause / stop** (forfeit) | `VestingStopped` (+ vested mint) | (a) Dr SHERS To Be Issued · Cr Investor Equity for any vested-but-unreleased part; (b) Dr SHERS To Be Issued · Cr Deferred SHER Compensation for the unvested remainder | BS: vested part issued, unvested grant reversed; no IS             |

This is the **same three events** as today, but `UC-VEST-01` now books the whole award (not a memo), `UC-VEST-02` clears
`SHERS To Be Issued` (not `Deferred SHER Compensation`), and `UC-VEST-03` reverses the unvested grant (not a memo).

### How it nets out

- **Fully vested and released** (award `X`): `Deferred SHER Compensation` = `X` (contra, −`X`), `SHERS To Be Issued` = 0, `Investor Equity`
  = +`X`. **Net equity 0, nothing on the income statement** — identical to a SHER wage fully paid in shares.
- **Stopped** with vested `V`, unvested `U` (`X = V + U`): the vested part is minted (`Investor Equity` +`V`) and the unvested grant is
  unwound (`Deferred SHER Compensation` and `SHERS To Be Issued` both drop by `U`). End state carries only `V` — the forfeited remainder
  leaves no trace, the article's forfeiture behaviour.

## Acceptance criteria

### Happy path

- [ ] Defining a vesting schedule immediately books the grant entry (`UC-VEST-01`) for the **full promised award**, valued at the SHER rate
      of record, with **no income-statement impact** and **no net equity change**.
- [ ] Releasing vested shares moves them from `SHERS To Be Issued` to `Investor Equity` (`UC-VEST-02`), and `Investor Equity` still equals
      the on-chain SHER supply.
- [ ] Stopping a schedule mints any vested-but-unreleased part and reverses the grant for the unvested remainder (`UC-VEST-03`).
- [ ] No entry ever hits the income statement — share vesting is entirely an equity transaction.
- [ ] All three actions remain visible in the books after a refresh.

### Business rules

- [ ] Every entry is balanced and the books balance at every level (`Assets = Liabilities + Equity`).
- [ ] `Investor Equity` is credited **only** at an actual on-chain mint (release/stop), never at grant — so it always reconciles to the
      on-chain supply.
- [ ] The full award sits in `Deferred SHER Compensation` (contra-equity) from grant, exactly offsetting the promised shares, so total
      equity is unchanged until — and after — they are minted.
- [ ] The same share issuance is never counted twice: the `Minted` event emitted in the release transaction is recognized as backed and not
      re-booked as a direct mint.

### Edge & error cases

- [ ] Stopping before anything vests reverses the **entire** grant entry, leaving no `Deferred SHER Compensation` or `SHERS To Be Issued`
      balance for that schedule.
- [ ] A member who never calls `release` keeps the full award in `Deferred SHER Compensation` / `SHERS To Be Issued` (promised, unminted) —
      never in `Investor Equity`.
- [ ] Re-reading a schedule after a full release shows `SHERS To Be Issued` cleared to 0 and `Investor Equity` raised by the released
      amount.

## Relationship to the two source models

- **vs. today (settlement-basis, catalogue §5.6):** today the grant is memo-only and the release books
  `Dr Deferred SHER Compensation · Cr Investor Equity`. Here the grant books the full award upfront and the release only clears
  `SHERS To Be Issued` — so the books show the committed compensation from day one.
- **vs. pure restricted stock (article):** the article additionally amortizes the award into an **income-statement expense** over the
  vesting period (`Dr SBC Expense · Cr Contra-equity`). We deliberately **omit** that step to respect the SHER structure (#2458): the cost
  stays in equity as a permanent `Deferred SHER Compensation` contra, never as a profit-and-loss charge. If the team ever wants vesting to
  reduce reported profit, that single expense-recognition step is the only addition needed.

## Dependencies

- The `Vesting` contract's `VestingCreated` / `TokensReleased` / `VestingStopped` events (read via getLogs —
  [`useVestingEventsViaLogs.ts`](../../../app/src/composables/vesting/useVestingEventsViaLogs.ts)).
- The existing SHER accounts in the chart of accounts (`Deferred SHER Compensation`, `SHERS To Be Issued`, `Investor Equity`) — no new
  account required.
- Vested/unvested split from the schedule for the stop split ([`vestingScheduleUtil.ts`](../../../app/src/utils/vestingScheduleUtil.ts)).
