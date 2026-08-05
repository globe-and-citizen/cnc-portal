import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { Address } from 'viem'
import { expenseAccountEip712Abi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type ExpenseAccountFunctionNames = WriteFunctionName<typeof expenseAccountEip712Abi>

/**
 * An Expense Account other than the team's current one — used to drain the one
 * belonging to an archived Officer generation. Omit it and the write targets
 * the current generation.
 */
export type ExpenseAccountAddressOverride = MaybeRefOrGetter<Address | undefined>

function useExpenseAccountContractWrite<F extends ExpenseAccountFunctionNames>(
  functionName: F,
  address?: ExpenseAccountAddressOverride
) {
  const teamStore = useTeamStore()
  const contractAddress = computed(
    () =>
      toValue(address) ??
      (teamStore.getContractAddressByType('ExpenseAccountEIP712') as Address | undefined)
  )
  return useContractWritesV3({
    contractAddress,
    abi: expenseAccountEip712Abi,
    functionName
  })
}

export function useOwnerWithdrawAllToBank(address?: ExpenseAccountAddressOverride) {
  return useExpenseAccountContractWrite('ownerWithdrawAllToBank', address)
}

export function useExpenseAccountTransfer() {
  return useExpenseAccountContractWrite('transfer')
}

export function useExpenseAccountActivateApproval() {
  return useExpenseAccountContractWrite('activateApproval')
}

export function useExpenseAccountDeactivateApproval() {
  return useExpenseAccountContractWrite('deactivateApproval')
}
