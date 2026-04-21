import { computed } from 'vue'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type ExpenseAccountFunctionNames = ExtractAbiFunctionNames<typeof EXPENSE_ACCOUNT_EIP712_ABI>

function useExpenseAccountContractWrite(functionName: ExpenseAccountFunctionNames) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))
  return useContractWritesV3({
    contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName
  })
}

export function useTransfer() {
  return useExpenseAccountContractWrite('transfer')
}

export function useDepositToken() {
  return useExpenseAccountContractWrite('depositToken')
}

export function useActivateApproval() {
  return useExpenseAccountContractWrite('activateApproval')
}

export function useDeactivateApproval() {
  return useExpenseAccountContractWrite('deactivateApproval')
}

export function useAddTokenSupport() {
  return useExpenseAccountContractWrite('addTokenSupport')
}

export function useRemoveTokenSupport() {
  return useExpenseAccountContractWrite('removeTokenSupport')
}

export function useInitialize() {
  return useExpenseAccountContractWrite('initialize')
}

export function useSetOfficerAddress() {
  return useExpenseAccountContractWrite('setOfficerAddress')
}

export function useOwnerWithdrawAllToBank() {
  return useExpenseAccountContractWrite('ownerWithdrawAllToBank')
}

export function useTransferOwnership() {
  return useExpenseAccountContractWrite('transferOwnership')
}

export function useRenounceOwnership() {
  return useExpenseAccountContractWrite('renounceOwnership')
}

export function usePause() {
  return useExpenseAccountContractWrite('pause')
}

export function useUnpause() {
  return useExpenseAccountContractWrite('unpause')
}
