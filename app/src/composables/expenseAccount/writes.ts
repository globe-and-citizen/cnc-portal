import { computed } from 'vue'
import { expenseAccountEip712Abi } from '@/artifacts/abi/generated'
import {
  useContractWritesV3,
  type WriteFunctionName
} from '@/composables/contracts/useContractWritesV3'
import { useTeamStore } from '@/stores/teamStore'

type ExpenseAccountFunctionNames = WriteFunctionName<typeof expenseAccountEip712Abi>

function useExpenseAccountContractWrite<F extends ExpenseAccountFunctionNames>(functionName: F) {
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
