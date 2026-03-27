<template>
  <div :class="{ tooltip: !canPayDividends }" :data-tip="cannotPayDividendsReason">
    <UButton
      color="primary"
      data-test="pay-dividends-button"
      :disabled="!canPayDividends"
      @click="openModal"
    >
      Pay Dividends
    </UButton>

    <UModal v-if="modalState.mount" v-model:open="modalState.show">
      <template #body>
        <PayDividendsForm
          v-if="modalState.show && currentTeam"
          :loading="isBankWriteLoading || isLoadingAddAction || isConfirmingAddAction"
          :token-symbol="tokenSymbol!"
          :team="currentTeam"
          :is-bod-action="isBodAction"
          @submit="handleSubmit"
          @close-modal="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Address } from 'viem'
import { encodeFunctionData, formatUnits, zeroAddress } from 'viem'
import PayDividendsForm from '@/components/sections/SherTokenView/forms/PayDividendsForm.vue'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useBodAddAction } from '@/composables/bod/writes'
import { useBodIsBodAction } from '@/composables/bod/reads'
import {
  useDistributeNativeDividends,
  useDistributeTokenDividends
} from '@/composables/bank/writes'
import { tokenSymbol as tokenSymbolUtils, tokenSymbolAddresses } from '@/utils'
import type { TokenId } from '@/constant'

interface Props {
  tokenSymbol?: string
  shareholdersCount?: number
  investorsAddress?: Address
  investorsOwner?: Address
  bankAddress?: Address
}

const props = defineProps<Props>()

const { address: currentAddress } = useUserDataStore()
const teamStore = useTeamStore()

const modalState = ref({
  mount: false,
  show: false
})

const depositAmount = ref<bigint>(0n)
const depositTokenAddress = ref<Address>(zeroAddress)

const distributeNativeDividendsWrite = useDistributeNativeDividends(depositAmount)
const distributeTokenDividendsWrite = useDistributeTokenDividends(
  depositTokenAddress,
  depositAmount
)

const isBankWriteLoading = computed(
  () =>
    distributeNativeDividendsWrite.writeResult.isPending.value ||
    distributeTokenDividendsWrite.writeResult.isPending.value
)

const addActionComposable = useBodAddAction()
const {
  executeAddAction: addAction,
  isPending: isLoadingAddAction,
  isConfirming: isConfirmingAddAction,
  isActionAdded
} = addActionComposable

const { isBodAction } = useBodIsBodAction(props.bankAddress as Address)

const currentTeam = computed(() => teamStore.currentTeam)

const canPayDividends = computed(() => {
  const hasTokenSymbol = !!props.tokenSymbol
  const hasShareholders = (props.shareholdersCount ?? 0) > 0
  const isAuthorized = isBodAction.value || currentAddress === props.investorsOwner

  return hasTokenSymbol && hasShareholders && isAuthorized
})

const cannotPayDividendsReason = computed(() => {
  if (!props.tokenSymbol) return 'Token symbol not available'
  if ((props.shareholdersCount ?? 0) === 0) return 'No shareholders available to pay dividends'
  if (!isBodAction.value && currentAddress !== props.investorsOwner) {
    return 'Only the bank owner can pay dividends'
  }
  return ''
})

const openModal = () => {
  modalState.value = { mount: true, show: true }
}

const closeModal = () => {
  modalState.value = { mount: false, show: false }
}

const handleSubmit = async (value: bigint, selectedTokenId: TokenId) => {
  if (value <= 0n) return

  if (isBodAction.value) {
    if (!props.bankAddress) return
    const data = encodeFunctionData({
      abi: BANK_ABI,
      functionName:
        selectedTokenId === 'native' ? 'distributeNativeDividends' : 'distributeTokenDividends',
      args:
        selectedTokenId === 'native'
          ? [value]
          : [tokenSymbolAddresses[selectedTokenId] as Address, value]
    })

    const description = JSON.stringify({
      text: `Pay dividends of ${formatUnits(value, 18)} ${tokenSymbolUtils(zeroAddress)} to ${props.investorsAddress}`,
      title: `Pay Dividends Request`
    })

    await addAction({
      targetAddress: props.bankAddress,
      description,
      data
    })
  } else {
    depositAmount.value = value

    if (selectedTokenId === 'native') {
      const result = await distributeNativeDividendsWrite.executeWrite([value])
      if (!result) return
    } else {
      depositTokenAddress.value = tokenSymbolAddresses[selectedTokenId] as Address
      const result = await distributeTokenDividendsWrite.executeWrite([
        depositTokenAddress.value,
        value
      ])

      if (!result) return
    }

    closeModal()
  }
}

watch(isActionAdded, (isAdded) => {
  if (isAdded) {
    closeModal()
  }
})

watch(
  () => modalState.value.show,
  (newShow) => {
    if (!newShow) {
      closeModal()
    }
  }
)
</script>
