import { computed } from 'vue'
import { expenseAccountEip712Abi } from '@/artifacts/abi/generated'
import { useContractWritesV3 } from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'
import type { ExtractAbiFunctionNames } from 'abitype'

type ExpenseAccountFunctionNames = ExtractAbiFunctionNames<typeof expenseAccountEip712Abi>

function useExpenseAccountContractWrite(functionName: ExpenseAccountFunctionNames) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))
  return useContractWritesV3({
    contractAddress,
    abi: expenseAccountEip712Abi,
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
