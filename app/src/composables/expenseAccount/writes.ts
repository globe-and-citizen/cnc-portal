import { computed, unref, type MaybeRef } from 'vue'
import type { Address, Hash, Hex } from 'viem'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useTeamStore } from '@/stores'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import type { BudgetLimit } from '@/types/expense-account'
import type { ExtractAbiFunctionNames } from 'abitype'

type ExpenseAccountFunctionNames = ExtractAbiFunctionNames<typeof EXPENSE_ACCOUNT_EIP712_ABI>

export function useExpenseAccountContractWrite(options: {
  functionName: ExpenseAccountFunctionNames
  args?: MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
}) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))

  return useContractWrites({
    contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: options.functionName,
    args: options.args ?? [],
    ...(options.value !== undefined ? { value: options.value } : {})
  })
}

export function useExpenseAccountActivateApproval(signatureHash: MaybeRef<Hash>) {
  const args = computed(() => [unref(signatureHash)] as readonly unknown[])
  return useExpenseAccountContractWrite({
    functionName: 'activateApproval',
    args
  })
}

export function useExpenseAccountDeactivateApproval(signatureHash: MaybeRef<Hash>) {
  const args = computed(() => [unref(signatureHash)] as readonly unknown[])
  return useExpenseAccountContractWrite({
    functionName: 'deactivateApproval',
    args
  })
}

export function useExpenseAccountDepositToken(
  tokenAddress: MaybeRef<Address>,
  amount: MaybeRef<bigint>
) {
  const args = computed(() => [unref(tokenAddress), unref(amount)] as readonly unknown[])
  return useExpenseAccountContractWrite({
    functionName: 'depositToken',
    args
  })
}

export function useExpenseAccountTransfer(
  to: MaybeRef<Address>,
  amount: MaybeRef<bigint>,
  budgetLimit: MaybeRef<BudgetLimit>,
  signature: MaybeRef<Hex>
) {
  const args = computed(
    () => [unref(to), unref(amount), unref(budgetLimit), unref(signature)] as readonly unknown[]
  )
  return useExpenseAccountContractWrite({
    functionName: 'transfer',
    args
  })
}

export function useExpenseAccountInitialize(
  owner: MaybeRef<Address>,
  usdtAddress: MaybeRef<Address>,
  usdcAddress: MaybeRef<Address>
) {
  const args = computed(
    () => [unref(owner), unref(usdtAddress), unref(usdcAddress)] as readonly unknown[]
  )
  return useExpenseAccountContractWrite({
    functionName: 'initialize',
    args
  })
}

export function useExpenseAccountTransferOwnership(newOwner: MaybeRef<Address>) {
  const args = computed(() => [unref(newOwner)] as readonly unknown[])
  return useExpenseAccountContractWrite({
    functionName: 'transferOwnership',
    args
  })
}

export function useExpenseAccountRenounceOwnership() {
  return useExpenseAccountContractWrite({
    functionName: 'renounceOwnership',
    args: []
  })
}

export function useExpenseAccountPause() {
  return useExpenseAccountContractWrite({
    functionName: 'pause',
    args: []
  })
}

export function useExpenseAccountUnpause() {
  return useExpenseAccountContractWrite({
    functionName: 'unpause',
    args: []
  })
}
