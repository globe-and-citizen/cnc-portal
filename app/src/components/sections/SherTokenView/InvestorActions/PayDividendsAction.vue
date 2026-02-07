<template>
  <div
    :class="{ tooltip: !canPayDividends }"
    :data-tip="cannotPayDividendsReason"
  >
    <ButtonUI
      variant="primary"
      data-test="pay-dividends-button"
      :disabled="!canPayDividends"
      @click="openModal"
    >
      Pay Dividends
    </ButtonUI>

    <ModalComponent
      v-model="modalState.show"
      v-if="modalState.mount"
      @reset="closeModal"
    >
      <PayDividendsForm
        v-if="modalState.show && currentTeam"
        :loading="isBankWriteLoading || isLoadingAddAction || isConfirmingAddAction"
        :token-symbol="tokenSymbol!"
        :team="currentTeam"
        :is-bod-action="isBodAction"
        @submit="handleSubmit"
        @close-modal="closeModal"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Address } from 'viem'
import { encodeFunctionData, formatUnits, zeroAddress } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import PayDividendsForm from '@/components/sections/SherTokenView/forms/PayDividendsForm.vue'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { useBodContract } from '@/composables/bod/'
import { useBankContract } from '@/composables/bank'
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
const { addErrorToast } = useToastStore()
const teamStore = useTeamStore()

const modalState = ref({
  mount: false,
  show: false
})

const {
  depositDividends,
  depositTokenDividends,
  bankWriteFunctionName,
  isBankWriteLoading,
  isConfirmed
} = useBankContract()

const { addAction, useBodIsBodAction, isLoading: isLoadingAddAction, isConfirming: isConfirmingAddAction, isActionAdded } =
  useBodContract()

const { isBodAction } = useBodIsBodAction(props.bankAddress as Address, BANK_ABI)

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
  if (isBodAction.value) {
    if (!props.investorsAddress) return

    const investorAddress = teamStore.getContractAddressByType('InvestorV1')
    const data = encodeFunctionData({
      abi: BANK_ABI,
      functionName: selectedTokenId === 'native' ? 'depositDividends' : 'depositTokenDividends',
      args:
        selectedTokenId === 'native'
          ? [value, investorAddress as Address]
          : [
              tokenSymbolAddresses[selectedTokenId] as Address,
              value,
              investorAddress as Address
            ]
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
    const investorAddress = teamStore.getContractAddressByType('InvestorV1')
    if (selectedTokenId === 'native') {
      await depositDividends(value.toString(), investorAddress as Address)
    } else {
      await depositTokenDividends(
        tokenSymbolAddresses[selectedTokenId] as Address,
        value.toString(),
        investorAddress as Address
      )
    }
  }
}

watch([isConfirmed, bankWriteFunctionName], ([newIsConfirmed, newbankWriteFunctionName]) => {
  if (
    newIsConfirmed &&
    (newbankWriteFunctionName === 'depositDividends' ||
      newbankWriteFunctionName === 'depositTokenDividends')
  ) {
    closeModal()
  }
})

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
