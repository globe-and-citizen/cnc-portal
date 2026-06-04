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

export function useOwnerWithdrawAllToBank() {
  return useExpenseAccountContractWrite('ownerWithdrawAllToBank')
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
