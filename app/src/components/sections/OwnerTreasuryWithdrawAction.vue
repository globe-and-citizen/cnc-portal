<template>
  <div v-if="hasTheRight" class="card-actions justify-end">
    <UButton
      color="warning"
      size="sm"
      :disabled="!hasWithdrawableBalance || isLoadingAction"
      data-test="owner-withdraw-button"
      label="Withdraw"
      @click="openWithdrawModal"
    />

    <UModal
      v-if="withdrawModal.mount"
      v-model:open="withdrawModal.show"
      title="Confirm Treasury Withdraw"
      description="Review this action before signing the transaction in MetaMask."
      :close="{ onClick: resetWithdrawState }"
    >
      <template #body>
        <div class="space-y-4">
          <UAlert
            v-if="modalWarningMessage"
            color="error"
            variant="soft"
            :description="modalWarningMessage"
            data-test="owner-withdraw-modal-warning"
          />

          <UAlert
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            title="You are about to withdraw all available funds to the Bank."
            description="By continuing, MetaMask will open and you will be asked to confirm the transaction."
          />

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="isLoadingAction"
              @click="resetWithdrawState"
            >
              Cancel
            </UButton>

            <UButton
              color="warning"
              :loading="isLoadingAction"
              :disabled="!hasWithdrawableBalance || isLoadingAction"
              data-test="owner-withdraw-modal-confirm-button"
              label="Withdraw"
              @click="confirmWithdrawFromModal"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { encodeFunctionData, type Address } from 'viem'
import { useContractBalance } from '@/composables'
import { useCashRemunerationOwner } from '@/composables/cashRemuneration/reads'
import { useOwnerWithdrawAllToBank as useCashOwnerWithdrawAll } from '@/composables/cashRemuneration/writes'
import { useExpenseAccountOwner } from '@/composables/expenseAccount/reads'
import { useOwnerWithdrawAllToBank as useExpenseOwnerWithdrawAll } from '@/composables/expenseAccount/writes'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { ContractType } from '@/types'
import type { ContractKey } from '@/composables/contracts/errorCatalogs.types'
import { classifyError } from '@/utils'
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
const withdrawModal = ref({ mount: false, show: false })
const modalWarningMessage = ref('')

const isCash = computed(() => props.contractType === 'CashRemunerationEIP712')

const contractAddress = computed(
  () => teamStore.getContractAddressByType(props.contractType) as Address | undefined
)

const abi = computed(() =>
  isCash.value ? CASH_REMUNERATION_EIP712_ABI : EXPENSE_ACCOUNT_EIP712_ABI
)

const errorContract = computed<ContractKey>(() =>
  isCash.value ? 'CashRemuneration' : 'ExpenseAccount'
)

const { data: cashRemunerationOwnerAddress } = useCashRemunerationOwner()
const { data: expenseAccountOwnerAddress } = useExpenseAccountOwner()

const ownerAddress = computed(() =>
  isCash.value ? cashRemunerationOwnerAddress.value : expenseAccountOwnerAddress.value
)

const { isBodAction } = useBodIsBodAction(contractAddress as unknown as Address)
const bodAddAction = useBodAddAction()

const isOwner = computed(() => {
  if (!ownerAddress.value || !userStore.address) return false
  return String(ownerAddress.value).toLowerCase() === userStore.address.toLowerCase()
})

const hasTheRight = computed(() => isOwner.value || isBodAction.value)

const { balances } = useContractBalance(contractAddress)
const hasWithdrawableBalance = computed(() => balances.value.some((b) => b.amount > 0))

const cashWithdraw = useCashOwnerWithdrawAll()
const expenseWithdraw = useExpenseOwnerWithdrawAll()

const withdrawTx = computed(() => (isCash.value ? cashWithdraw : expenseWithdraw))

const isLoadingAction = computed(
  () =>
    isSubmitting.value ||
    withdrawTx.value.isPending.value ||
    bodAddAction.isPending.value ||
    bodAddAction.isConfirming.value
)

const resetWithdrawState = () => {
  withdrawModal.value = { mount: false, show: false }
  modalWarningMessage.value = ''
}

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

const openWithdrawModal = () => {
  modalWarningMessage.value = ''
  withdrawModal.value = { mount: true, show: true }
}

const confirmWithdrawFromModal = async () => {
  if (!contractAddress.value) return
  isSubmitting.value = true
  modalWarningMessage.value = ''

  try {
    if (isBodAction.value) {
      await bodAddAction.executeAddAction({
        targetAddress: contractAddress.value,
        description: JSON.stringify({
          text: 'Withdraw all funds to Bank',
          title: 'Owner Treasury Withdraw All to Bank'
        }),
        data: encodeFunctionData({
          abi: abi.value,
          functionName: 'ownerWithdrawAllToBank',
          args: []
        }),
        userAddress: userStore.address
      })
      return
    }

    await withdrawTx.value.mutateAsync({ args: [] })
    toast.add({ title: 'Withdraw successful', color: 'success' })
    resetWithdrawState()
    await refreshContractBalances()
  } catch (error: unknown) {
    const classified = classifyError(error, { contract: errorContract.value })

    if (classified.category === 'user_rejected') {
      modalWarningMessage.value = 'Owner rejected the request.'
      return
    }

    toast.add({ title: classified.userMessage, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

watch(
  () => bodAddAction.isActionAdded.value,
  (added) => {
    if (!added) return
    toast.add({
      title: 'Action added successfully, waiting for board confirmation',
      color: 'success'
    })
    resetWithdrawState()
  }
)
</script>
