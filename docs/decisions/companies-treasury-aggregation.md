# ADR — Companies List: treasury aggregation strategy

- **Status:** Accepted (Sprint 16)
- **Spike:** #2129 · **Goal:** #2128

## Context

The redesigned Companies list (#2128) shows, per company: a consolidated **USD balance**, an `≈ POL` figure, a distribution split **by account** (Bank / Safe / Expense / Cash) and **by token** (POL / USDC / ETH / SHER); plus a cross-company **aggregate** (total, `You own / Member`, and `by company / by token / by account`).

The `Team` model (`app/src/types/team.ts`) carries **no** balance / treasury / last-activity data — only `name`, `description`, `members`, `ownerAddress`, `teamContracts`, `safeAddress`, `_count.members`.

## Options considered

1. **Client-side aggregation** — per team, read each account contract + token balance via wagmi/viem and value it in USD with a price feed.
   - ➖ N teams × M accounts × tokens reads on list load (slow, rate-limited); needs a price oracle; no offline/test story; multi-token USD normalization is still being built (#2112).
2. **Backend / indexer aggregate endpoint** — one call returns per-team + aggregate treasury already valued in USD.
   - ➖ Needs backend work outside this sprint's scope. ➕ Fast, cacheable, testable.

## Decision

Introduce a single composable seam — **`useTeamsTreasury(teams)`** — that owns **all** aggregation, role derivation and percentage math, fed by a **swappable balance source** `fetchTeamTreasury`.

- The **computation layer** (per-team normalization, aggregate, role from `ownerAddress` vs the current user, percentage segments for the bars) is implemented and **unit-tested now**.
- The **balance source** is initially a **deterministic placeholder** (clearly marked) derived from team identity, so the UI is fully functional and demoable, with a documented TODO to swap in either (a) the backend aggregate endpoint when it exists, or (b) the #2112 USD-normalization primitives for a client-side reader.
- **`Last activity`** is not available from the backend → the table column is omitted (behind a flag) for now.
- **Per-card distribution** stays "by account"; the recap strip's `by company / token / account` toggle drives only the **aggregate** bar — matching the canonical mockup.

## Consequences

- The page ships complete and tested; treasury **figures are placeholder** until the data source is wired (tracked as a follow-up).
- Swapping the real source in is a **one-function change** (`fetchTeamTreasury`) with no UI or composable churn.
