# On-chain invalidation map

Which **contract reads** each **contract write** dirties, and by which mechanism (if any) they get invalidated today. Companion to
[`README.md`](./README.md) (§"What V3 gives you").

Scope: the chain layer only — `useReadContract` / `useBalance` / custom `useQuery` reads under `app/src/composables/**`. Backend REST
invalidation is a separate surface (`app/src/queries/**`, see [`QUERY_FACTORY.md`](../../queries/QUERY_FACTORY.md)).

**Read this before adding a write composable.** The built-in invalidation covers less than its name suggests, and the gap is not obvious
from the call site.

---

## 1. The three mechanisms

| #     | Mechanism                                                        | Where                                                    | What it reaches                                                                                                                |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **A** | Built-in predicate in `useContractWritesV3`                      | [`useContractWritesV3.ts:252`](./useContractWritesV3.ts) | queries whose key is `['readContract', { address: <written contract>, … }]` — scoped to `chainId` only when the write pins one |
| **B** | `cfg.onSuccess` on the write, or an `onSuccess` at the call site | feature composables / components                         | whatever the author wrote by hand                                                                                              |
| **C** | Nothing — the read refreshes on its own                          | —                                                        | `staleTime` expiry + refocus / remount, or an explicit `refetch()`                                                             |

### The matching rule that decides everything

`invalidateQueries({ queryKey })` uses `partialMatchKey` — `Object.keys(filter).every(...)` with an early `typeof a !== typeof b → false`.
Two consequences that shape this whole document:

1. **Mechanism A only fires on `key[0] === 'readContract'`.** Any other namespace is invisible to it.
2. **An ERC-20 balance of contract X is keyed on the _token_ address, not on X.** `balanceOf(bank)` →
   `['readContract', { address: USDC, args: [bank], … }]`. A write to the Bank therefore **never** invalidates the Bank's token balances
   through mechanism A.

Corollary: mechanism A covers _view functions of the contract you just wrote to_ (`owner`, `paused`, `getShareholders`, `getLendingOffer`,
…) and **no balance of any kind**.

---

## 2. Read key namespaces

| Key shape                                                                                                                                                                                | Produced by                                                                                                                                              |                                      Reachable by A?                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------: |
| `['readContract', { address, args, functionName, chainId }]`                                                                                                                             | `useReadContract` — every `*/reads.ts`                                                                                                                   |                           ✅ when `address` === written contract                           |
| `['balance', { address, chainId }]`                                                                                                                                                      | `useBalance` in [`useContractBalance.ts`](../useContractBalance.ts) — the native balance of every contract card                                          |                                             ❌                                             |
| `['bank-events-logs' \| 'expense-events-logs' \| 'cash-remuneration-events-logs' \| 'investor-events-logs' \| 'fixed-return-events-logs' \| 'safe-deposit-router-events-logs', address]` | [`useContractEventsViaLogs`](../eventsViaLogs.ts) — the transaction feeds                                                                                | ⚠️ FixedReturn repayment refreshes its own feed; other write paths remain unreachable by A |
| `['fixedReturnAllOffers', addr]`<br>`['fixedReturnOfferLenders', addr, offerId, token]`<br>`['fixedReturnMyLenderPositions', addr, lender, offerIds]`                                    | [`fixedReturn/reads.ts`](../fixedReturn/reads.ts) — hand-rolled multi-read aggregates                                                                    |                                             ❌                                             |
| `['fixedReturnOwner', addr]`                                                                                                                                                             | [`stores/communityCredit.ts`](../../stores/communityCredit.ts)                                                                                           |                                             ❌                                             |
| `['campaign', 'events', address, chainId]`                                                                                                                                               | [`campaign/reads.ts`](../campaign/reads.ts)                                                                                                              |                                             ❌                                             |
| `['pastElections', address]`                                                                                                                                                             | `PastElectionsSection.vue`                                                                                                                               |                                             ❌                                             |
| `['officer-beacon-folder', address]`                                                                                                                                                     | [`useOfficerBeaconFolder.ts`](./useOfficerBeaconFolder.ts) — `staleTime: Infinity`                                                                       |                       ❌ (by design: a proxy's beacon never changes)                       |
| `['transfer-initiators', hashes]`                                                                                                                                                        | `accounting/useTransferInitiators.ts`                                                                                                                    |                                             ❌                                             |
| _(no key at all)_                                                                                                                                                                        | imperative `readContract` in `ProposalsList.vue`, `ContractOwnerCard.vue`, `useContractFunctions.ts` — results live in component refs, outside the cache |                            ❌ **unreachable by any mechanism**                             |

---

## 3. Write → reads it dirties

Legend — **A** built-in predicate · **B** hand-written · **C** left to staleness · ❌ gap.

### Bank

| Write                                     | Reads dirtied                                                                                                                                                                       | Covered by                                                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transfer` (native out)                   | `['balance', bank]`, `['balance', recipient]`, `bank-events-logs`                                                                                                                   | **B** `TransferModal.vue:222` invalidates `['balance', {bank, chainId}]` · recipient ❌ · feed ❌                                                |
| `transferToken`                           | `balanceOf(token, bank)`, `balanceOf(token, recipient)`, `bank-events-logs`                                                                                                         | **B** `TransferModal.vue:225` invalidates `['readContract', {token, args:[bank]}]` · recipient ❌ · feed ❌                                      |
| `depositToken` (+ ERC-20 `approve` first) | `balanceOf(token, user)`, `balanceOf(token, bank)`, `allowance(token, user, bank)`, `bank-events-logs`                                                                              | **B** `DepositBankForm.vue:239` invalidates both `balanceOf` · `allowance` via **A** on the _token_ write ✅ · feed ❌                           |
| `distributeNativeDividends`               | `['balance', bank]`, `['balance', <each shareholder>]`, `bank-events-logs`                                                                                                          | **❌ nothing** — `PayDividendsAction.vue` has no `onSuccess` invalidation                                                                        |
| `distributeTokenDividends`                | `balanceOf(token, bank)`, `balanceOf(token, <each shareholder>)`, `bank-events-logs`                                                                                                | **❌ nothing** — same file                                                                                                                       |
| `fundFixedReturnRepayment`                | **cross-contract** → FixedReturn `getLendingOffer` / `totalEntitlementOf` / the 3 aggregates, `balanceOf(token, bank)`, `balanceOf(token, fixedReturn)`, `fixed-return-events-logs` | **B** `RoundView.vue` invalidates the 3 aggregates and FixedReturn feed, then refetches the Bank token balance ✅ · FixedReturn token balance ❌ |

> Mechanism A on any Bank write invalidates only `useBankOwner` — never a balance.

### ERC-20 (`erc20/writes.ts`, address = the token)

| Write      | Reads dirtied                                    | Covered by                                                              |
| ---------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `approve`  | `allowance(token, owner, spender)`               | **A** ✅ (same address)                                                 |
| `transfer` | `balanceOf(token, from)`, `balanceOf(token, to)` | **A** ✅ (same address — this is the one case where A reaches balances) |

### ExpenseAccountEIP712

| Write                                     | Reads dirtied                                                                                                 | Covered by                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transfer`                                | `['balance', expenseAccount]` or `balanceOf(token, expenseAccount)`, recipient balance, `expense-events-logs` | **❌** `TransferAction.vue:237` invalidates only the backend `expenseKeys.list` — **no chain balance at all**                                             |
| `ownerWithdrawAllToBank`                  | expense account balances → **cross-contract** Bank balances                                                   | **B** `OwnerTreasuryWithdrawAction.vue:152-157` invalidates `['balance', {contract}]` + `['readContract', {args:[contract]}]` ✅ · Bank side ❌ · feed ❌ |
| `activateApproval` / `deactivateApproval` | on-chain approval state (same address)                                                                        | **A** ✅ (+ **B** `expenseKeys.list`)                                                                                                                     |

### CashRemunerationEIP712

| Write                                                                                                                                           | Reads dirtied                                                                                                                                   | Covered by                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `withdraw`                                                                                                                                      | `['balance', cashRemuneration]` / `balanceOf(token, cashRemuneration)`, user balance, `cash-remuneration-events-logs`, **backend** claim status | **B** backend sync only (and that path is broken — see §5) · chain balances ❌ · feed ❌ |
| `enableClaim` / `disableClaim`                                                                                                                  | hashed claim state (same address), **backend** claim status                                                                                     | **A** ✅ for the chain state · backend ❌ broken (§5)                                    |
| `ownerWithdrawAllToBank`                                                                                                                        | own balances → **cross-contract** Bank balances                                                                                                 | **B** via `OwnerTreasuryWithdrawAction.vue` ✅ own side · Bank side ❌                   |
| `addTokenSupport` / `removeTokenSupport` / `pause` / `unpause` / `setOfficerAddress` / `transferOwnership` / `renounceOwnership` / `initialize` | same-address view functions (`owner`, …)                                                                                                        | **A** ✅                                                                                 |

### Investor / SherToken

| Write                                                                                                                                                          | Reads dirtied                                                                  | Covered by                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `individualMint`                                                                                                                                               | `totalSupply`, `balanceOf`, `getShareholders` (same address)                   | **A** ✅ — plus **B** `MintForm.vue:211` invalidates **all** `['readContract']` app-wide (works, over-broad)                                                                                                                                                          |
| `distributeMint`                                                                                                                                               | same                                                                           | **A** ✅ + `emit('refetchShareholders')`                                                                                                                                                                                                                              |
| `claim` / `bulkClaim` / `completeMigration` ([`useClaimMigration`](../investor/useClaimMigration.ts), [`useSweepMigration`](../investor/useSweepMigration.ts)) | `balanceOf`, `getMigrationRoot`, `isMigrationComplete`, `investor-events-logs` | **❌ nothing** — these call `executeContractWrite` directly inside a bare `useMutation`, so **mechanism A never runs**                                                                                                                                                |
| `setMigrationRoot` ([`useSetMigrationRoot`](../investor/useSetMigrationRoot.ts), [`useShareholderMigration`](../investor/useShareholderMigration.ts))          | `getMigrationRoot`                                                             | **❌/B** same bypass — `ShareholderMigrationBanner.vue:114` compensates with an explicit `refetchMigrationRoot()` + `['contracts']`                                                                                                                                   |
| `configureBeacon` / `deployBeaconProxy` ([`useInvestorUpgrade`](../investor/useInvestorUpgrade.ts))                                                            | every Investor read (the address changes), `officer-beacon-folder`             | **B** `useInvestorUpgrade` runs inside the Officer redeploy orchestrator → `useInvalidateOfficerQueries()` (teams + contracts) ✅ for the address · `officer-beacon-folder` is `staleTime: Infinity` but keyed by officer address, so a new Officer gets a new key ✅ |

> The four `executeContractWrite` call sites are the systematic hole: `executeContractWrite` is the framework-agnostic function — it has no
> `queryClient`. Only `useContractWritesV3` invalidates.

### FixedReturn (Community Credit)

| Write                                                                         | Reads dirtied                                                                                                                                  | Covered by                                                                                                          |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `createLendingOffer`                                                          | `getTotalOfferings`, `getLendingOffer`, `['fixedReturnAllOffers']`                                                                             | **A** ✅ for the `readContract` pair · **B** `NewView.vue:323` for the aggregate ✅                                 |
| `lendFunds` (+ ERC-20 `approve`)                                              | the 3 aggregates, `getLenderDeposits`, `hasDeposited`, `balanceOf(token, lender)`, `balanceOf(token, fixedReturn)`, `fixed-return-events-logs` | **A** ✅ same-address reads · **B** `CreditLendModal.vue:321-323` all 3 aggregates ✅ · token balances ❌ · feed ❌ |
| `markAsRefundable` / `claimRefund` / `refundLenders` / `acceptPartialFunding` | the 3 aggregates + same-address reads (+ token balances for the refund paths)                                                                  | **A** ✅ · **B** `RoundView.vue` invalidates the aggregates and FixedReturn feed ✅ · token balances ❌             |
| `addTokenSupport` / `removeTokenSupport`                                      | `isTokenSupported`, `getSupportedTokens`                                                                                                       | **A** ✅                                                                                                            |

### Vesting

| Write                     | Reads dirtied                                                                      | Covered by                                     |
| ------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| `addVesting`              | `getVestingsWithMembers`, `getAllArchivedVestingsFlat`                             | **A** ✅                                       |
| `release` / `stopVesting` | same **+ cross-contract** Investor `balanceOf` / `totalSupply` (shares are minted) | **A** ✅ Vesting side · **B** ✅ Investor side |

### Elections

| Write            | Reads dirtied                                                                                        | Covered by                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `createElection` | `getElection`, `getVoteCount`, `getElectionCandidates`, `getElectionEligibleVoters`                  | **A** ✅                                                                                  |
| `castVote`       | `getVoteCount`, `hasVoted`                                                                           | **A** ✅                                                                                  |
| `publishResults` | `getElectionWinners`, `['pastElections']`, **cross-contract** BoD `getBoardOfDirectors` / `isMember` | **A** ✅ same-address · **B** `PublishResult.vue:64` `['pastElections']` ✅ · BoD side ❌ |

### BoardOfDirectors

| Write       | Reads dirtied                                            | Covered by                                                                                                                                                                           |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `addAction` | `isActionExecuted`, `getOwners`, **backend** action list | **A** ✅ · backend via `useCreateActionMutation` → `actionKeys.all` ✅ · the `['getBodActions']` call in [`bod/writes.ts:47`](../bod/writes.ts) is a **dead key** (no query uses it) |
| `approve`   | `isActionExecuted`, `isMember`, **backend** action list  | **A** ✅ · backend only when the action crossed its threshold ⚠️ · same dead key at `writes.ts:164`                                                                                  |

### SafeDepositRouter

| Write                                                                                                                                                            | Reads dirtied                                                                                                   | Covered by                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `deposit`                                                                                                                                                        | **cross-contract** Investor `balanceOf` / `totalSupply`, `['balance', safe]`, `safe-deposit-router-events-logs` | **B** [`safeDepositRouter/writes.ts:69`](../safeDepositRouter/writes.ts) predicate on the investor address ✅ · Safe balance ❌ · feed ❌ |
| `enableDeposits` / `disableDeposits` / `setMultiplier` / `setSafeAddress` / `addTokenSupport` / `removeTokenSupport` / `transferOwnership` / `renounceOwnership` | `depositsEnabled`, `multiplier`, `safeAddress`, `isTokenSupported`, `owner`, `calculateCompensation`            | **A** ✅                                                                                                                                  |

### Proposals

| Write                         | Reads dirtied     | Covered by                                                                                                                                                   |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createProposal` / `castVote` | the proposal list | **❌ unreachable** — `ProposalsList.vue` reads imperatively via `@wagmi/core` `readContract`; refresh relies on `emit('proposal-created')` + its own `watch` |

### Safe (multisig, off-chain tx service)

Covered separately in [`queries/safe.mutations.ts`](../../queries/safe.mutations.ts): each mutation hand-invalidates `safeKeys.info` /
`transactions` / `balance` / `tokenBalance`. `safeKeys.balance` and `safeKeys.tokenBalance` deliberately mirror the wagmi key shapes
(`['balance', …]`, `['readContract', …]`) so they cross the namespace boundary — the right instinct, applied only here.

---

## 4. Reverse index — read → writes that dirty it

| Read                                                                                                                                                                                                                              | Dirtied by                                                                                                                                                                                             | Refreshed today?                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `['balance', <contract>]` (native, `useContractBalance`)                                                                                                                                                                          | Bank `transfer`/`distributeNativeDividends`, ExpenseAccount `transfer`/`ownerWithdrawAllToBank`, CashRemuneration `withdraw`/`ownerWithdrawAllToBank`, SafeDepositRouter `deposit`, any Safe execution | partially — **B** in 4 components, missing on dividends, expense `transfer`, CR `withdraw`, SDR `deposit`. Never by **A**. `refetchInterval: 300_000` is the real backstop. |
| `balanceOf(token, <contract>)`                                                                                                                                                                                                    | same list, token variants                                                                                                                                                                              | same, minus the same-address ERC-20 case                                                                                                                                    |
| `allowance(token, owner, spender)`                                                                                                                                                                                                | ERC-20 `approve`                                                                                                                                                                                       | **A** ✅                                                                                                                                                                    |
| `owner` / `paused` / `depositsEnabled` / `multiplier` / `isTokenSupported` / `getShareholders` / `totalSupply` / `getVestingsWithMembers` / `getElection*` / `hasVoted` / `isMember` / `isActionExecuted` / `getLendingOffer` / … | the same contract's writes                                                                                                                                                                             | **A** ✅ — this is exactly what A is good at                                                                                                                                |
| `['fixedReturnAllOffers' \| 'fixedReturnOfferLenders' \| 'fixedReturnMyLenderPositions']`                                                                                                                                         | every FixedReturn write + Bank `fundFixedReturnRepayment`                                                                                                                                              | **B** ✅ in all 4 Community Credit components (the most disciplined domain in the app)                                                                                      |
| `['fixedReturnOwner']`                                                                                                                                                                                                            | FixedReturn `transferOwnership`                                                                                                                                                                        | **C** — never invalidated (low risk: owner rarely changes)                                                                                                                  |
| `['*-events-logs']` (6 transaction feeds)                                                                                                                                                                                         | **every** value-moving write on the matching contract                                                                                                                                                  | ⚠️ Bank-funded FixedReturn repayments refresh `fixed-return-events-logs`; other feeds rely on `staleTime: 30_000` + refocus.                                                |
| `['campaign', 'events', …]`                                                                                                                                                                                                       | campaign donate/withdraw (no write composable in-tree yet)                                                                                                                                             | **C**                                                                                                                                                                       |
| `['pastElections']`                                                                                                                                                                                                               | Elections `publishResults`                                                                                                                                                                             | **B** ✅                                                                                                                                                                    |
| `['officer-beacon-folder']`                                                                                                                                                                                                       | Officer redeploy                                                                                                                                                                                       | key changes with the officer address ✅                                                                                                                                     |
| `['transfer-initiators']`                                                                                                                                                                                                         | any write producing a transfer                                                                                                                                                                         | **C**                                                                                                                                                                       |
| `ProposalsList` / `ContractOwnerCard` / `useContractFunctions` reads                                                                                                                                                              | Proposals + generic admin writes                                                                                                                                                                       | **unreachable** — outside the cache by construction                                                                                                                         |

---

## 5. Ranked gaps

1. **The 6 `*-events-logs` transaction feeds are never invalidated.** After a deposit or transfer the balance updates but the transaction
   row doesn't appear until a refocus past the 30 s `staleTime`. Affects Bank, Expense, Community Credit, Investor, Cash Remuneration,
   SafeDepositRouter.
2. **`PayDividendsAction.vue` invalidates nothing.** Dividends are paid, no balance anywhere refreshes.
3. **`TransferAction.vue` (ExpenseAccount `transfer`) invalidates only the backend expense list** — no chain balance.
4. **The 4 `executeContractWrite` call sites bypass mechanism A entirely** (`useClaimMigration`, `useSweepMigration`, `useSetMigrationRoot`,
   `useShareholderMigration`). Two of them compensate by hand; the Merkle-claim paths don't.
5. **Cross-contract pairs with no invalidation:** ExpenseAccount/CashRemuneration `ownerWithdrawAllToBank` → Bank balances · Elections
   `publishResults` → BoD membership · SafeDepositRouter `deposit` → Safe balance · Bank `fundFixedReturnRepayment` → both token balances.
6. **Dead keys** — `['getBodActions']` ([`bod/writes.ts:47`](../bod/writes.ts), `:164`) matches no query. Backend-side equivalents:
   `['weekly-claims', teamId]` (`WeeklyClaimActionEnable.vue:68`, `WeeklyClaimActionDropdown.vue:253`) and `['team', {teamId}]`
   (`CreateAddCampaign.vue:163`), plus the `undefined`-laden key from `useSyncWeeklyClaimsMutation`.
7. **`ProposalsList.vue` / `ContractOwnerCard.vue` read outside the cache** — no invalidation strategy is even possible until they move to
   `useReadContract`.

---

## 6. What to build instead

The pattern that already works is **per-domain invalidation helpers**, in the shape of
[`useInvalidateOfficerQueries`](./useOfficerDeployment.ts):

```ts
// composables/bank/invalidate.ts
export function useInvalidateBankQueries() {
  const queryClient = useQueryClient();
  return async (bank: Address, tokens: Address[] = []) => {
    await queryClient.invalidateQueries({
      queryKey: ["balance", { address: bank }],
    });
    await Promise.all(
      tokens.map((t) =>
        queryClient.invalidateQueries({
          queryKey: ["readContract", { address: t, args: [bank] }],
        }),
      ),
    );
    await queryClient.invalidateQueries({
      queryKey: ["bank-events-logs", bank.toLowerCase()],
    });
  };
}
```

Three rules that follow from §1:

- **Never hand-write a key namespace in a component.** Every namespace in §2 should have exactly one key factory exporting it, imported by
  both the read and the invalidation (`safeKeys` already does this — nothing else does).
- **Balances need an explicit invalidation, always.** Mechanism A cannot reach them. A shared `invalidateBalances(address, tokens)` removes
  the per-component drift documented in §3.
- **A feed is part of the write's effect.** If a write emits an event the UI renders, its `*-events-logs` key belongs in the same
  `onSuccess`. A prefix predicate (`key[0].endsWith('-events-logs')`) closes all six at once.

Guard it with a test that registers the real read keys against a real `QueryClient` and asserts each write's invalidation matches ≥1 of
them. Asserting `invalidateQueries` "was called with a key" — what the current specs do — cannot catch a key that matches nothing, which is
how every item in §5.6 shipped.
