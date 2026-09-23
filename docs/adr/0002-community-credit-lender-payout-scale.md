# ADR-0002: Keep unbounded push-based lender payouts in FixedReturn at current scale

**Status:** Accepted

**Date:** 2026-09-20

**Decision owners:** CNC Portal maintainers

## Context

[`FixedReturn.sol`](../../contract/contracts/FixedReturn.sol)'s `refundLenders` and `repayLenders` each loop over every lender recorded for
an offer (`s_offerLenders[offerId]`) and push one token transfer per lender, inside a single transaction. Both functions already carry a
NatSpec note accepting this as a tradeoff at "current scale" — this ADR is the decision that makes that judgment explicit and durable,
backed by measured evidence instead of a restated assumption. Tracked by
[issue #2769](https://github.com/globe-and-citizen/cnc-portal/issues/2769), a decision deliverable separate from the four DX delivery slices
under [issue #2652](https://github.com/globe-and-citizen/cnc-portal/issues/2652) (finding F9).

**Lender-count bound.** There is no on-chain cap on lender count. `s_offerLenders[offerId]` grows by one every time a _new_ address
successfully calls `lendFunds` (deduplicated via `s_hasDeposited`). For a Whitelist-access round, the practical ceiling is however many
addresses the issuer whitelisted. For a **General-access round, there is no on-chain ceiling at all** — `lendFunds` is `external` and
callable by any address; it is not gated to a company's own team members. The app's UI only ever _shows_ team members as candidate lenders
for a round — the contract itself does not enforce that boundary.

**Expected scale, confirmed with the feature owner.** Community Credit rounds are a single company's own internal capital raise among its
own members. A company's member list is itself typically small, which naturally bounds lender count to the tens even without an on-chain cap
— for the intended usage. This assumption does not hold if Community Credit is ever opened beyond a single company's own member base (see
Consequences).

**Gas evidence.** Measured directly against
[`contract/test/FixedReturnPayoutGasBenchmark.spec.ts`](../../contract/test/FixedReturnPayoutGasBenchmark.spec.ts), which deploys a real
`FixedReturn` instance, funds N distinct lender wallets, and reads `gasUsed` off the actual transaction receipt for `refundLenders` and
`repayLenders` at N = 5, 10, 25, 50, 100:

| N (lenders) | `refundLenders` gas | `repayLenders` gas |
| ----------- | ------------------- | ------------------ |
| 5           | 216,861             | 349,145            |
| 10          | 368,606             | 622,950            |
| 25          | 823,841             | 1,444,365          |
| 50          | 1,582,566           | 2,813,402          |
| 100         | 3,100,016           | 5,551,452          |

Both curves are linear across the measured range (fixed per-call overhead plus a constant marginal cost per lender, with no observed
super-linear growth at this scale):

- `refundLenders` ≈ 65,116 + 30,349 × N gas.
- `repayLenders` ≈ 75,339 + 54,761 × N gas (steeper — it does an extra `SSTORE` and a conditional per lender for the cumulative-entitlement
  bookkeeping that `refundLenders` doesn't need).

`contract/hardhat.config.ts` sets a 30,000,000 block gas limit for the local simulated dev chain only — that value does not describe Polygon
PoS mainnet, the repo's real deployment target (the `polygon` network entry has no client-side gas-limit setting, since block gas limit is a
property of the live chain, not something a client configures). Polygon PoS mainnet's actual current block gas limit is **90,000,000**,
raised from a previous 80M ceiling on 2026-02-13 ([Polygon's announcement](https://x.com/0xPolygon), no hardfork required — enabled by
configurable parameters from the December 2025 Madhugiri upgrade). Extrapolating each fitted line to that real ceiling: `refundLenders`
would approach it around **N ≈ 2,963 lenders**; `repayLenders`, the steeper and therefore binding curve, around **N ≈ 1,642 lenders**.
(Against the local dev chain's more conservative 30M figure, the same lines project to ≈986 and ≈546 respectively — still comfortable
headroom at the agreed scale, just a tighter bound than the real network's.) At the agreed tens-of-lenders scale, both functions run at a
small fraction of a percent of the real block gas limit — comfortable headroom, not a close call, under either figure.

**Liveness risk.** Read directly from the contract: a single failing `token.safeTransfer` inside either loop (e.g. a lender address that is
a contract rejecting the token, or an address blocked by a token with blocklist logic) reverts the entire transaction, including the state
transition (`offer.state = OfferState.Refundable` / `.Repaying`) that shares it. Today, one bad recipient blocks every other lender's refund
or repayment installment until the issuer can work around it — there is no per-lender retry or skip path in the current contract. Community
Credit's supported tokens are standard USDC/USDCe (per the [feature README](../features/community-credit/README.md)), which do not have
blocklist-driven transfer reverts as a normal-user scenario; this failure mode is real but not expected to occur in ordinary operation at
the current token set.

## Decision

**Keep the current unbounded push-based payout design in `FixedReturn.sol` as-is. No contract change.**

At the agreed tens-of-lenders scale, the measured gas cost is a small fraction of a percent of Polygon's real 90M block gas limit for both
`refundLenders` and `repayLenders` — roughly 30× headroom (in lender count) before `repayLenders`, the binding curve, would even approach
that limit. Even against the local dev chain's more conservative 30M figure, that headroom is still roughly 10×. The liveness risk (one bad
recipient blocking the whole distribution) is real but not remediated by any of the candidate directions without introducing new complexity
and, for pull/claim settlement, a product-visible UX change — not justified against a risk that is not currently expected to materialize at
the agreed scale.

This decision should be revisited, not re-derived from scratch, if either input changes materially (see Consequences).

## Considered Options

1. **Cap or paginate the lender set per transaction** — e.g. limit lenders-per-offer, or split `refundLenders`/`repayLenders` into multiple
   paginated calls. Bounds worst-case gas per call, but adds a new operational step (the issuer must call more than once for a large offer)
   and a new on-chain limit that has to be chosen and enforced, for a risk that isn't present at the agreed scale.
2. **Batched push across multiple transactions** — same shape as pagination, offered by the issue as a distinct option; same tradeoff:
   solves a problem the gas evidence shows doesn't currently exist, at the cost of a more complex issuer flow.
3. **Pull/claim-based settlement** — each lender claims their own refund/repayment instead of receiving it automatically. This is the only
   option that actually eliminates the "one bad recipient blocks everyone" liveness risk (an isolated claim transaction only affects that
   one lender), but it is a genuine product/UX change, not just internal plumbing: lenders would need to take an explicit action they don't
   take today, and the portal would need new UI, state, and notifications for "claimable, not yet claimed." Worth reconsidering if the
   liveness risk becomes real (see Consequences), but not justified purely on gas grounds today.

## Consequences

- No `FixedReturn.sol` change is made as a result of this ADR.
- The benchmark test (`contract/test/FixedReturnPayoutGasBenchmark.spec.ts`) stays in the suite as a lightweight regression check — if a
  future contract change makes the per-lender cost meaningfully worse, this test's numbers will visibly diverge from the ones recorded
  above, which is the signal to revisit this decision rather than let the assumption silently go stale.
- **Revisit this decision if:** Community Credit ever opens a round beyond a single company's own member base (removing the natural
  tens-of-lenders bound described in Context), or if a round's expected lender count is otherwise expected to approach the low hundreds — at
  that point, pull/claim settlement (option 3) is the most likely direction, since it's the only option that also addresses the liveness
  risk rather than only the gas ceiling.
- The General-access on-chain gap noted in Context (any address can call `lendFunds`, not just team members) is a pre-existing contract
  behavior, not something this ADR introduces or changes — recorded here because it's directly relevant to whether the tens-of-lenders
  assumption holds, not as a new finding to act on.

## Related Documentation

- [Community Credit feature README](../features/community-credit/README.md)
- [`FixedReturn.sol`](../../contract/contracts/FixedReturn.sol)
- [Gas benchmark evidence](../../contract/test/FixedReturnPayoutGasBenchmark.spec.ts)
- [Issue #2769](https://github.com/globe-and-citizen/cnc-portal/issues/2769)
- [Issue #2652](https://github.com/globe-and-citizen/cnc-portal/issues/2652)
- [Architecture Decision Records](./README.md)
