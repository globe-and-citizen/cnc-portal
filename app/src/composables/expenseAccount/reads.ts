import { computed, unref, type MaybeRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, type Address, type Hash } from 'viem'
import { useTeamStore } from '@/stores'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import type { BudgetLimit } from '@/types/expense-account'

/**
 * ExpenseAccountEIP712 contract address helper
 */
export function useExpenseAccountAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('ExpenseAccountEIP712'))
}

export function useExpenseAccountOwner() {
  const contractAddress = useExpenseAccountAddress()

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'owner',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

export function useExpenseAccountPaused() {
  const contractAddress = useExpenseAccountAddress()

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'paused',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

export function useExpenseAccountBalance() {
  const contractAddress = useExpenseAccountAddress()

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'getBalance',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}

export function useExpenseAccountGetTokenBalance(tokenAddress: MaybeRef<Address>) {
  const contractAddress = useExpenseAccountAddress()
  const tokenAddressValue = computed(() => unref(tokenAddress))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'getTokenBalance',
    args: [tokenAddressValue],
    query: {
      enabled: computed(
        () =>
          !!contractAddress.value &&
          isAddress(contractAddress.value) &&
          !!tokenAddressValue.value &&
          isAddress(tokenAddressValue.value)
      )
    }
  })
}

export function useExpenseAccountSupportedTokens(symbol: MaybeRef<string>) {
  const contractAddress = useExpenseAccountAddress()
  const symbolValue = computed(() => unref(symbol))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'supportedTokens',
    args: [symbolValue],
    query: {
      enabled: computed(
        () => !!contractAddress.value && isAddress(contractAddress.value) && !!symbolValue.value
      )
    }
  })
}

export function useExpenseAccountIsTokenSupported(tokenAddress: MaybeRef<Address>) {
  const contractAddress = useExpenseAccountAddress()
  const tokenAddressValue = computed(() => unref(tokenAddress))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'isTokenSupported',
    args: [tokenAddressValue],
    query: {
      enabled: computed(
        () =>
          !!contractAddress.value &&
          isAddress(contractAddress.value) &&
          !!tokenAddressValue.value &&
          isAddress(tokenAddressValue.value)
      )
    }
  })
}

export function useExpenseAccountBudgetLimitHash(budgetLimit: MaybeRef<BudgetLimit>) {
  const contractAddress = useExpenseAccountAddress()
  const budgetLimitValue = computed(() => unref(budgetLimit))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'budgetLimitHash',
    args: [budgetLimitValue],
    query: {
      enabled: computed(() => !!contractAddress.value && isAddress(contractAddress.value))
    }
  } as never)
}

export function useExpenseAccountExpenseBalances(signatureHash: MaybeRef<Hash>) {
  const contractAddress = useExpenseAccountAddress()
  const signatureHashValue = computed(() => unref(signatureHash))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'expenseBalances',
    args: [signatureHashValue],
    query: {
      enabled: computed(
        () =>
          !!contractAddress.value && isAddress(contractAddress.value) && !!signatureHashValue.value
      )
    }
  })
}

export function useExpenseAccountCurrentPeriod(budgetLimit: MaybeRef<BudgetLimit>) {
  const contractAddress = useExpenseAccountAddress()
  const budgetLimitValue = computed(() => unref(budgetLimit))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'getCurrentPeriod',
    args: [budgetLimitValue],
    query: {
      enabled: computed(() => !!contractAddress.value && isAddress(contractAddress.value))
    }
  } as never)
}

export function useExpenseAccountPeriod(
  budgetLimit: MaybeRef<BudgetLimit>,
  timestamp: MaybeRef<bigint>
) {
  const contractAddress = useExpenseAccountAddress()
  const budgetLimitValue = computed(() => unref(budgetLimit))
  const timestampValue = computed(() => unref(timestamp))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'getPeriod',
    args: [budgetLimitValue, timestampValue],
    query: {
      enabled: computed(
        () => !!contractAddress.value && isAddress(contractAddress.value) && !!timestampValue.value
      )
    }
  } as never)
}

export function useExpenseAccountIsNewPeriod(
  budgetLimit: MaybeRef<BudgetLimit>,
  signatureHash: MaybeRef<Hash>
) {
  const contractAddress = useExpenseAccountAddress()
  const budgetLimitValue = computed(() => unref(budgetLimit))
  const signatureHashValue = computed(() => unref(signatureHash))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'isNewPeriod',
    args: [budgetLimitValue, signatureHashValue],
    query: {
      enabled: computed(
        () =>
          !!contractAddress.value && isAddress(contractAddress.value) && !!signatureHashValue.value
      )
    }
  } as never)
}

export function useExpenseAccountValidateTransfer(
  budgetLimit: MaybeRef<BudgetLimit>,
  amount: MaybeRef<bigint>,
  signatureHash: MaybeRef<Hash>
) {
  const contractAddress = useExpenseAccountAddress()
  const budgetLimitValue = computed(() => unref(budgetLimit))
  const amountValue = computed(() => unref(amount))
  const signatureHashValue = computed(() => unref(signatureHash))

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'validateTransfer',
    args: [budgetLimitValue, amountValue, signatureHashValue],
    query: {
      enabled: computed(
        () =>
          !!contractAddress.value &&
          isAddress(contractAddress.value) &&
          !!amountValue.value &&
          !!signatureHashValue.value
      )
    }
  } as never)
}

export function useExpenseAccountEip712Domain() {
  const contractAddress = useExpenseAccountAddress()

  return useReadContract({
    address: contractAddress,
    abi: EXPENSE_ACCOUNT_EIP712_ABI,
    functionName: 'eip712Domain',
    query: { enabled: !!contractAddress.value && isAddress(contractAddress.value) }
  })
}
