<template>
  <div v-if="hasTheRight" class="card-actions justify-end">
    <ButtonUI
      variant="warning"
      size="sm"
      :disabled="withdrawableTokens.length === 0"
      @click="openModal"
      data-test="owner-withdraw-button"
    >
      Withdraw
    </ButtonUI>

    <teleport to="body">
      <ModalComponent
        v-model="showModal.show"
        v-if="showModal.mount"
        data-test="owner-withdraw-modal"
        @reset="resetModal"
      >
        <div class="flex flex-col gap-2">
          <h1 class="text-2xl font-bold">Owner Treasury Withdraw</h1>
        </div>

        <TokenAmount
          :tokens="withdrawableTokens"
          v-model:modelValue="withdrawAmount"
          v-model:modelToken="selectedTokenId"
          :isLoading="isLoadingAction"
          @validation="(value) => (isAmountValid = value)"
        >
          <template #label>
            <span class="label-text">Withdraw token</span>
            <span class="label-text-alt"
              >Balance: {{ selectedToken?.balance ?? 0 }} {{ selectedToken?.symbol ?? '' }}</span
            >
          </template>
        </TokenAmount>

        <div class="modal-action mt-4 justify-between">
          <ButtonUI variant="error" outline @click="resetModal">Cancel</ButtonUI>
          <ButtonUI
            variant="warning"
            :loading="isLoadingAction"
            :aria-busy="isLoadingAction"
            :disabled="isLoadingAction || !isAmountValid || !selectedToken"
            @click="submitWithdraw"
            data-test="owner-withdraw-submit"
          >
            Withdraw
          </ButtonUI>
        </div>
      </ModalComponent>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { encodeFunctionData, parseEther, parseUnits, type Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import TokenAmount from '@/components/forms/TokenAmount.vue'
import { useContractBalance } from '@/composables'
import { useCashRemunerationOwner } from '@/composables/cashRemuneration/reads'
import { useCashRemunerationContractWrite } from '@/composables/cashRemuneration/writes'
import { useExpenseAccountOwner } from '@/composables/expenseAccount/reads'
import { useExpenseAccountContractWrite } from '@/composables/expenseAccount/writes'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { SUPPORTED_TOKENS } from '@/constant'
import type { ContractType, TokenOption } from '@/types'
import { useBodAddAction } from '@/composables/bod/writes'
import { useBodIsBodAction } from '@/composables/bod/reads'
import { useQueryClient } from '@tanstack/vue-query'
import { useChainId } from '@wagmi/vue'

type WithdrawContractType = Extract<ContractType, 'CashRemunerationEIP712' | 'ExpenseAccountEIP712'>

interface WithdrawTokenOption extends TokenOption {
  address: Address
  decimals: number
}

const props = defineProps<{
  contractType: WithdrawContractType
}>()

const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toastStore = useToastStore()
const queryClient = useQueryClient()
const chainId = useChainId()

const showModal = ref({ mount: false, show: false })
const isAmountValid = ref(false)
const withdrawAmount = ref('0')
const selectedTokenId = ref('native')
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

const withdrawableTokens = computed<WithdrawTokenOption[]>(() => {
  const supportedTokenIds = SUPPORTED_TOKENS.map((token) => token.id)
  const allowedByContract =
    props.contractType === 'ExpenseAccountEIP712'
      ? ['native', 'usdc', 'usdt']
      : [...supportedTokenIds, 'sher']

  return balances.value
    .filter((balance) => allowedByContract.includes(balance.token.id) && balance.amount > 0)
    .map((balance) => ({
      tokenId: balance.token.id,
      symbol: balance.token.symbol,
      name: balance.token.name,
      code: balance.token.code,
      balance: balance.amount,
      price: balance.values['USD']?.price ?? 0,
      address: balance.token.address,
      decimals: balance.token.decimals
    }))
})

const selectedToken = computed(() =>
  withdrawableTokens.value.find((token) => token.tokenId === selectedTokenId.value)
)

watch(withdrawableTokens, (tokens) => {
  if (!tokens.length) return
  if (!tokens.some((token) => token.tokenId === selectedTokenId.value)) {
    selectedTokenId.value = tokens[0]?.tokenId ?? 'native'
  }
})

const cashWithdrawNativeWrite = useCashRemunerationContractWrite({
  functionName: 'ownerWithdrawNative'
})
const cashWithdrawTokenWrite = useCashRemunerationContractWrite({
  functionName: 'ownerWithdrawToken'
})
const expenseWithdrawNativeWrite = useExpenseAccountContractWrite({
  functionName: 'ownerWithdrawNative'
})
const expenseWithdrawTokenWrite = useExpenseAccountContractWrite({
  functionName: 'ownerWithdrawToken'
})

const isLoadingWrite = computed(() => {
  const writes = [
    cashWithdrawNativeWrite,
    cashWithdrawTokenWrite,
    expenseWithdrawNativeWrite,
    expenseWithdrawTokenWrite
  ]

  return writes.some(
    (write) => write.writeResult.isPending.value || write.receiptResult.isLoading.value
  )
})

const isLoadingAction = computed(
  () =>
    isSubmitting.value ||
    isLoadingWrite.value ||
    isLoadingAddAction.value ||
    isConfirmingAddAction.value
)

const isConfirmingWithdraw = computed(
  () =>
    cashWithdrawNativeWrite.receiptResult.isLoading.value ||
    cashWithdrawTokenWrite.receiptResult.isLoading.value ||
    expenseWithdrawNativeWrite.receiptResult.isLoading.value ||
    expenseWithdrawTokenWrite.receiptResult.isLoading.value
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

const resetModal = () => {
  showModal.value = { mount: false, show: false }
  withdrawAmount.value = '0'
  isAmountValid.value = false
}

const openModal = () => {
  showModal.value = { mount: true, show: true }
}

const submitWithdraw = async () => {
  if (!contractAddress.value || !selectedToken.value) return
  isSubmitting.value = true

  try {
    if (selectedToken.value.tokenId === 'native') {
      const amount = parseEther(withdrawAmount.value)

      if (isBodAction.value) {
        const encodedData = encodeFunctionData({
          abi: abi.value,
          functionName: 'ownerWithdrawNative',
          args: [amount]
        })

        const description = JSON.stringify({
          text: `Withdraw ${withdrawAmount.value} ${selectedToken.value.symbol} to ${String(ownerAddress.value ?? '')}`,
          title: 'Owner Treasury Withdraw Request'
        })

        await addAction({
          targetAddress: contractAddress.value,
          description,
          data: encodedData,
          userAddress: userStore.address
        })
        return
      }

      const nativeWrite =
        props.contractType === 'CashRemunerationEIP712'
          ? cashWithdrawNativeWrite
          : expenseWithdrawNativeWrite

      const hash = await nativeWrite.executeWrite([amount], undefined, { skipGasEstimation: true })

      if (!hash) {
        toastStore.addErrorToast('Withdraw failed')
      }

      return
    }

    const amount = parseUnits(withdrawAmount.value, selectedToken.value.decimals)

    if (isBodAction.value) {
      const encodedData = encodeFunctionData({
        abi: abi.value,
        functionName: 'ownerWithdrawToken',
        args: [selectedToken.value.address, amount]
      })

      const description = JSON.stringify({
        text: `Withdraw ${withdrawAmount.value} ${selectedToken.value.symbol} to ${String(ownerAddress.value ?? '')}`,
        title: 'Owner Treasury Withdraw Request'
      })

      await addAction({
        targetAddress: contractAddress.value,
        description,
        data: encodedData,
        userAddress: userStore.address
      })
      return
    }

    const tokenWrite =
      props.contractType === 'CashRemunerationEIP712'
        ? cashWithdrawTokenWrite
        : expenseWithdrawTokenWrite

    const hash = await tokenWrite.executeWrite([selectedToken.value.address, amount], undefined, {
      skipGasEstimation: true
    })

    if (!hash) {
      toastStore.addErrorToast('Withdraw failed')
    }
  } catch (error: unknown) {
    console.error(error)
    const message =
      typeof error === 'object' && error !== null && 'shortMessage' in error
        ? String((error as { shortMessage?: string }).shortMessage || 'Failed to withdraw funds')
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: string }).message || 'Failed to withdraw funds')
          : 'Failed to withdraw funds'
    toastStore.addErrorToast(message)
  } finally {
    isSubmitting.value = false
  }
}

watch(isActionAdded, (added) => {
  if (added) {
    toastStore.addSuccessToast('Action added successfully, waiting for board confirmation')
    resetModal()
  }
})

watch(isConfirmingWithdraw, async (newIsConfirming, oldIsConfirming) => {
  if (newIsConfirming || !oldIsConfirming || !showModal.value.show) return

  toastStore.addSuccessToast('Withdraw successful')
  await refreshContractBalances()
  resetModal()
})
</script>
