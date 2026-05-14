# Contract write composables

`useContractWritesV3` is the single entry point for every on-chain write in the
app. Every feature composable under `app/src/composables/<contract>/writes.ts`
wraps it; no feature code reaches into `@wagmi/vue` `useWriteContract` /
`useWaitForTransactionReceipt` or `@wagmi/core` `writeContract` /
`waitForTransactionReceipt` directly.

V2 (`useContractWritesV2`) has been removed. The legacy `useContractWrites` /
`useBankWrites` / `useVestingWrites` API documented in previous revisions of
this file no longer exists.

The deployment helpers `useOfficerDeployment` / `useOfficerRedeploy` are the
two exceptions exported from this directory — they target `deployContract`
flows, not regular function calls, and are out of scope for this guide.

## What V3 gives you

`useContractWritesV3(cfg)` returns a TanStack mutation. The `mutationFn`:

1. simulates the call against the configured chain,
2. submits the validated request via `writeContract`,
3. waits for the receipt and throws `ContractWriteRevertedError` if the
   transaction reverted on-chain — with the ABI-decoded revert reason attached
   as `cause` when recoverable,
4. on success, invalidates every `useReadContract` query targeting the same
   contract address (scoped to `chainId` when pinned).

`cfg.onSuccess` is awaited, so cross-contract invalidation queued by the caller
settles before `mutateAsync` resolves. `cfg.onError` runs after the built-in
error log.

## 1. Shape of a write composable

Every feature wraps `useContractWritesV3` behind a thin, ABI-typed factory.
The factory exists for two reasons: it injects the contract address from the
team store, and it narrows `functionName` to the contract's ABI so callers get
compile-time errors for typos.

`app/src/composables/bank/writes.ts` is the canonical shape — copy it when
adding a new contract:

```ts
import { computed } from 'vue'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type BankFunctionNames = ExtractAbiFunctionNames<typeof BANK_ABI>

function useBankContractWrite(functionName: BankFunctionNames) {
  const teamStore = useTeamStore()
  const bankAddress = computed(() => teamStore.getContractAddressByType('Bank'))
  return useContractWritesV3({
    contractAddress: bankAddress,
    abi: BANK_ABI,
    functionName
  })
}

export function useTransfer() {
  return useBankContractWrite('transfer')
}

export function useTransferToken() {
  return useBankContractWrite('transferToken')
}
```

Rules of thumb:

- **One composable, one function.** `useTransfer` wraps `transfer`,
  `useDepositToken` wraps `depositToken`. Do not bundle several writes behind
  one composable — callers need independent `isPending` / `error` states per
  call site.
- **Pass refs, not values, for addresses.** `useContractWritesV3` accepts
  `MaybeRef` for `contractAddress`, `abi`, `functionName`, and `chainId`. Keep
  the address reactive so the mutation tracks store updates.
- **Pin `chainId` only when you mean it.** Omitting `chainId` lets wagmi
  resolve the chain from the connected wallet at call time and invalidates
  reads across every chain in the cache. Pin it when the contract is single-
  chain and you want narrow invalidation.
- **No `args` / `value` at composable construction.** They are per-call:

  ```ts
  const transfer = useTransfer()
  await transfer.mutateAsync({ args: [to, amount] })
  ```

`abi` is widened to `Abi` inside `useContractWritesV3`, so `variables.args` is
**not** structurally validated against the function signature. The
`ExtractAbiFunctionNames` factory above gives you function-name safety; argument
typing remains the caller's responsibility.

## 2. Error handling

The convention is **reactive error + `classifyError` + `UAlert`**. Components
keep their own `errorMessage` ref and a `UAlert` slot; the mutation's `error`
state is consumed via `classifyError` (`@/utils`) which buckets every viem /
wagmi error into a semantic category and resolves a user-facing message from
the per-contract revert catalog.

```vue
<template>
  <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
  <UButton :loading="withdraw.isPending.value" @click="onWithdraw">Withdraw</UButton>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { classifyError } from '@/utils'
import { useOwnerWithdrawAllToBank } from '@/composables/cashRemuneration/writes'

const errorMessage = ref('')
const withdraw = useOwnerWithdrawAllToBank()
const toast = useToast()

const onWithdraw = async () => {
  errorMessage.value = ''
  try {
    await withdraw.mutateAsync({ args: [] })
    toast.add({ title: 'Withdraw successful', color: 'success' })
  } catch (error) {
    const classified = classifyError(error, { contract: 'CashRemuneration' })

    if (classified.category === 'user_rejected') {
      errorMessage.value = 'You rejected the request.'
      return
    }

    toast.add({ title: classified.userMessage, color: 'error' })
  }
}
</script>
```

Apply this everywhere:

- **Branch on `category`, never parse `userMessage`.** The categories are
  `user_rejected`, `insufficient_gas`, `chain_mismatch`, `contract_revert`,
  `no_contract`, `network`, `tx_dropped`, `unknown`. Each maps to a stable
  UX decision (silent, retry, escalate, etc.).
- **Pass `{ contract }` to `classifyError`.** Without it you get the generic
  catalog. The contract key is what unlocks per-contract overrides for
  `contract_revert` errors (e.g. `InsufficientTokenBalance` → "You do not have
  enough tokens to complete this transfer").
- **Silence `user_rejected`.** Treat it as a UI state, not an error — set a
  warning in the modal or simply clear the loading state. Do not toast.
- **`UAlert` for in-context errors, `toast` for transient ones.** Use the
  alert when the user is mid-flow inside a modal/form (they need to see the
  message and decide what to do). Use the toast for fire-and-forget actions.
- **Log with `parseErrorV2(error)` or `parseError(error, abi)` before
  surfacing.** `useContractWritesV3` already logs via `parseErrorV2` on the
  built-in `onError`, so additional logging in the component is only needed
  when you want extra context.

For non-V3 paths that still need an error message — e.g. a `simulateContract`
preflight or a `readContract` allowance check — use `parseError(error, abi)`
which returns a plain string (see
`src/components/sections/ExpenseAccountView/TransferAction.vue` for the
pattern).

## 3. Testing recipe

`createContractWriteV3Mock()` from `@/tests/mocks/erc20.mock` returns a
TanStack-mutation-shaped object with `vi.fn()` for `mutate` / `mutateAsync` /
`reset` and refs for `isPending` / `isSuccess` / `isError` / `error` / `data` /
`status`. Pre-baked mock groups for each contract live in
`@/tests/mocks/contract.mock` (`mockBankWrites`, `mockExpenseAccountWrites`,
…), and per-contract setup files in `src/tests/setup/<contract>.setup.ts` wire
them in via `vi.mock(...)` so the corresponding feature composables resolve to
the mocks during tests.

Standard pattern:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { UserRejectedRequestError, BaseError } from 'viem'
import { mockCashRemunerationWrites, resetContractMocks } from '@/tests/mocks'
import OwnerTreasuryWithdrawAction from '../OwnerTreasuryWithdrawAction.vue'

describe('OwnerTreasuryWithdrawAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
    mockCashRemunerationWrites.ownerWithdrawAllToBank.mutateAsync.mockResolvedValue({
      hash: '0xhash'
    })
  })

  it('toasts success and refreshes balances', async () => {
    const wrapper = mount(OwnerTreasuryWithdrawAction, {
      props: { contractType: 'CashRemunerationEIP712' }
    })
    await wrapper.get('[data-test="owner-withdraw-button"]').trigger('click')
    await wrapper.get('[data-test="owner-withdraw-modal-confirm-button"]').trigger('click')
    await flushPromises()

    expect(mockCashRemunerationWrites.ownerWithdrawAllToBank.mutateAsync).toHaveBeenCalledWith({
      args: []
    })
  })

  it('surfaces the rejection warning when the user rejects', async () => {
    mockCashRemunerationWrites.ownerWithdrawAllToBank.mutateAsync.mockRejectedValueOnce(
      new BaseError('reject', {
        cause: new UserRejectedRequestError(new Error('rejected'))
      })
    )
    // …mount, click, assert warning rendered without a toast.
  })
})
```

Practical notes:

- **Always call `resetContractMocks()` in `beforeEach`.** It restores every V3
  write mock to `isPending=false`, `data=null`, etc., and clears `mutate` /
  `mutateAsync` call counts. Without it, tests leak state across cases.
- **Drive through the user-facing surface, not `wrapper.vm`.** Trigger clicks
  / inputs and assert on `mutateAsync` calls + emitted toasts / alerts.
- **`mutateAsync.mockRejectedValueOnce(viemError)` is how you exercise error
  paths.** Wrap rejections in `new BaseError('…', { cause })` so
  `classifyError` walks the chain and picks up the category. Plain `new
Error()` falls into `category: 'unknown'`.
- **`mutateAsync` resolves to whatever you set with `mockResolvedValue`.**
  The default returned by `resetContractMocks` is `undefined`; pass `{ hash:
'0xhash' }` (or the full V3 result shape) when the component reads from the
  resolved value.
- **`createContractWriteV3Mock()` directly** is for ad-hoc cases (a new
  contract not yet pre-baked, or a component-local mock). The pre-baked
  groups under `mockBankWrites`, `mockBODWrites`, etc. cover everything
  currently wired in `tests/setup/*.setup.ts`.

## API surface

| Export                        | Where                         | Purpose                                                                                                              |
| ----------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `useContractWritesV3`         | `useContractWritesV3.ts`      | TanStack mutation wrapper — what every feature `writes.ts` calls.                                                    |
| `executeContractWrite`        | `useContractWritesV3.ts`      | Framework-agnostic simulate → write → wait. Use from services that have no Vue scope.                                |
| `ContractWriteRevertedError`  | `useContractWritesV3.ts`      | Thrown when a tx mined but reverted. Carries `hash`, `receipt`, `simulation`, and the ABI-decoded revert as `cause`. |
| `classifyError`               | `@/utils/classifyError`       | Buckets any viem/wagmi error into a category + resolves a user-facing message.                                       |
| `parseError` / `parseErrorV2` | `@/utils/errorUtil`           | String formatters for logging or non-V3 paths.                                                                       |
| `createContractWriteV3Mock`   | `@/tests/mocks/erc20.mock`    | TanStack-mutation-shaped mock factory.                                                                               |
| `resetContractMocks`          | `@/tests/mocks/contract.mock` | Resets every pre-baked V3 write/read mock between tests.                                                             |
