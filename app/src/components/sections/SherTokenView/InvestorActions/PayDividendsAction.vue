<template>
  <div :class="{ tooltip: !canPayDividends }" :data-tip="cannotPayDividendsReason">
    <ButtonUI
      variant="primary"
      data-test="pay-dividends-button"
      :disabled="!canPayDividends"
      @click="openModal"
    >
      Pay Dividends
    </ButtonUI>

    <ModalComponent v-model="modalState.show" v-if="modalState.mount" @reset="closeModal">
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
import { useTeamStore, useUserDataStore } from '@/stores'
import { useBodAddAction } from '@/composables/bod/writes'
import { useBodIsBodAction } from '@/composables/bod/reads'
import { useDepositDividends, useDepositTokenDividends } from '@/composables/bank/writes'
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
const investorAddress = computed(() => teamStore.getContractAddressByType('InvestorV1') as Address)

const depositDividendsWrite = useDepositDividends(depositAmount, investorAddress)
const depositTokenDividendsWrite = useDepositTokenDividends(
  depositTokenAddress,
  depositAmount,
  investorAddress
)

const isBankWriteLoading = computed(
  () =>
    depositDividendsWrite.writeResult.isPending.value ||
    depositTokenDividendsWrite.writeResult.isPending.value
)

const addActionComposable = useBodAddAction(null)
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
  if (isBodAction.value) {
    if (!props.investorsAddress) return
    const investorAddr = investorAddress.value
    if (!investorAddr) return
    const data = encodeFunctionData({
      abi: BANK_ABI,
      functionName: selectedTokenId === 'native' ? 'depositDividends' : 'depositTokenDividends',
      args:
        selectedTokenId === 'native'
          ? [value, investorAddr]
          : [tokenSymbolAddresses[selectedTokenId] as Address, value, investorAddr]
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
    const investorAddr = investorAddress.value
    if (!investorAddr) return
    depositAmount.value = value

    if (selectedTokenId === 'native') {
      const result = await depositDividendsWrite.executeWrite([value, investorAddr], value)
      if (!result) throw new Error('Deposit failed')
    } else {
      depositTokenAddress.value = tokenSymbolAddresses[selectedTokenId] as Address
      const result = await depositTokenDividendsWrite.executeWrite([
        depositTokenAddress.value,
        value,
        investorAddr
      ])
      if (!result) throw new Error('Deposit failed')
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
