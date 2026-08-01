import { computed } from 'vue'
import type { ContractFunctionName } from 'viem'
import { fixedReturnAbi } from '@/artifacts/abi/generated'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useFixedReturnAddress } from './reads'

/** State-changing names only. */
type FixedReturnWriteNames = ContractFunctionName<typeof fixedReturnAbi, 'nonpayable' | 'payable'>

function useFixedReturnContractWrite<F extends FixedReturnWriteNames>(functionName: F) {
  const fixedReturnAddress = useFixedReturnAddress()
  return useContractWritesV3({
    contractAddress: computed(() => fixedReturnAddress.value ?? undefined),
    abi: fixedReturnAbi,
    functionName
  })
}

export function useFixedReturnCreateLendingOffer() {
  return useFixedReturnContractWrite('createLendingOffer')
}

export function useFixedReturnLendFunds() {
  return useFixedReturnContractWrite('lendFunds')
}

// markAsRefundable / claimRefund were removed from FixedReturn in v1.3.0 —
// useFixedReturnRefundLenders below replaces both with a single date-gated push
// refund. The wrappers for them are gone: the typed ABI rejects the names, and the
// Issue Note refund UI the previous comment pointed at (OfferingIssuerActions.vue,
// OfferingDetail.vue) no longer exists in the repo.
export function useFixedReturnRefundLenders() {
  return useFixedReturnContractWrite('refundLenders')
}

// Alternative to refundLenders for a stalled offer (deadline passed, target not
// reached): keeps whatever was raised instead of returning it to lenders.
export function useFixedReturnAcceptPartialFunding() {
  return useFixedReturnContractWrite('acceptPartialFunding')
}

// repayLenders is intentionally not exposed here — it's onlyBank on-chain now, so
// the frontend triggers it indirectly via Bank.fundFixedReturnRepayment (see
// composables/bank/writes.ts's useFundFixedReturnRepayment). A direct call from a
// connected wallet would always revert with NotBank.

export function useFixedReturnAddTokenSupport() {
  return useFixedReturnContractWrite('addTokenSupport')
}

export function useFixedReturnRemoveTokenSupport() {
  return useFixedReturnContractWrite('removeTokenSupport')
}
