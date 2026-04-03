<template>
  <div v-if="hasTheRight" class="card-actions justify-end">
    <UButton
      color="warning"
      size="sm"
      :disabled="!hasWithdrawableBalance || isLoadingAction"
      :loading="isLoadingAction"
      data-test="owner-withdraw-button"
      label="Withdraw"
      @click="submitWithdrawAll"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { encodeFunctionData, type Address } from 'viem'
import { useContractBalance } from '@/composables'
import { useCashRemunerationOwner } from '@/composables/cashRemuneration/reads'
import { useCashRemunerationContractWrite } from '@/composables/cashRemuneration/writes'
import { useExpenseAccountOwner } from '@/composables/expenseAccount/reads'
import { useExpenseAccountContractWrite } from '@/composables/expenseAccount/writes'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { ContractType } from '@/types'
import { useBodAddAction } from '@/composables/bod/writes'
import { useBodIsBodAction } from '@/composables/bod/reads'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'

type WithdrawContractType = Extract<ContractType, 'CashRemunerationEIP712' | 'ExpenseAccountEIP712'>

const props = defineProps<{
  contractType: WithdrawContractType
}>()

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toast = useToast()
const queryClient = useQueryClient()
const chainId = useChainId()

const isSubmitting = ref(false)

const contractAddress = computed(
  () => teamStore.getContractAddressByType(props.contractType) as Address | undefined
)

const abi = computed(() =>
  props.contractType === 'CashRemunerationEIP712'
    ? CASH_REMUNERATION_EIP712_ABI
    : EXPENSE_ACCOUNT_EIP712_ABI
)

const { data: cashRemunerationOwnerAddress } = useCashRemunerationOwner()
const { data: expenseAccountOwnerAddress } = useExpenseAccountOwner()

const ownerAddress = computed(() =>
  props.contractType === 'CashRemunerationEIP712'
    ? cashRemunerationOwnerAddress.value
    : expenseAccountOwnerAddress.value
)

const { isBodAction } = useBodIsBodAction(contractAddress as unknown as Address)

const {
  executeAddAction: addAction,
  isPending: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded
} = useBodAddAction()

const isOwner = computed(() => {
  if (!ownerAddress.value || !userStore.address) return false
  return String(ownerAddress.value).toLowerCase() === userStore.address.toLowerCase()
})

const hasTheRight = computed(() => isOwner.value || isBodAction.value)

const { balances } = useContractBalance(contractAddress)

const hasWithdrawableBalance = computed(() => balances.value.some((b) => b.amount > 0))

const cashWithdrawAllWrite = useCashRemunerationContractWrite({
  functionName: 'ownerWithdrawAllToBank'
})
const expenseWithdrawAllWrite = useExpenseAccountContractWrite({
  functionName: 'ownerWithdrawAllToBank'
})

const isLoadingWrite = computed(
  () =>
    cashWithdrawAllWrite.writeResult.isPending.value ||
    cashWithdrawAllWrite.receiptResult.isLoading.value ||
    expenseWithdrawAllWrite.writeResult.isPending.value ||
    expenseWithdrawAllWrite.receiptResult.isLoading.value
)

const isLoadingAction = computed(
  () =>
    isSubmitting.value ||
    isLoadingWrite.value ||
    isLoadingAddAction.value ||
    isConfirmingAddAction.value
)

const isConfirmingWithdraw = computed(
  () =>
    cashWithdrawAllWrite.receiptResult.isLoading.value ||
    expenseWithdrawAllWrite.receiptResult.isLoading.value
)

const refreshContractBalances = async () => {
  if (!contractAddress.value) return

  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['balance', { address: contractAddress.value, chainId: chainId.value }]
    }),
    queryClient.invalidateQueries({
      queryKey: ['readContract', { args: [contractAddress.value], chainId: chainId.value }]
    })
  ])
}

const submitWithdrawAll = async () => {
  if (!contractAddress.value) return
  isSubmitting.value = true

  try {
    if (isBodAction.value) {
      const encodedData = encodeFunctionData({
        abi: abi.value,
        functionName: 'ownerWithdrawAllToBank',
        args: []
      })

      const description = JSON.stringify({
        text: 'Withdraw all funds to Bank',
        title: 'Owner Treasury Withdraw All to Bank'
      })

      await addAction({
        targetAddress: contractAddress.value,
        description,
        data: encodedData,
        userAddress: userStore.address
      })
      return
    }

    const write =
      props.contractType === 'CashRemunerationEIP712'
        ? cashWithdrawAllWrite
        : expenseWithdrawAllWrite

    const hash = await write.executeWrite([], undefined, { skipGasEstimation: true })

    if (!hash) {
      toast.add({ title: 'Withdraw failed', color: 'error' })
    }
  } catch (error: unknown) {
    console.error(error)
    const message =
      typeof error === 'object' && error !== null && 'shortMessage' in error
        ? String((error as { shortMessage?: string }).shortMessage || 'Failed to withdraw funds')
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: string }).message || 'Failed to withdraw funds')
          : 'Failed to withdraw funds'
    toast.add({ title: message, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

watch(isActionAdded, (added) => {
  if (added) {
    toast.add({
      title: 'Action added successfully, waiting for board confirmation',
      color: 'success'
    })
  }
})

watch(isConfirmingWithdraw, async (newIsConfirming, oldIsConfirming) => {
  if (newIsConfirming || !oldIsConfirming) return

  toast.add({ title: 'Withdraw successful', color: 'success' })
  await refreshContractBalances()
})
</script>
