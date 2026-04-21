<template>
  <div :class="{ tooltip: !canPayDividends }" :data-tip="cannotPayDividendsReason">
    <ActionButton
      icon="heroicons:arrow-trending-up"
      icon-bg="bg-blue-50 dark:bg-blue-950"
      icon-color="text-blue-700 dark:text-blue-400"
<<<<<<< Updated upstream
      title="Pay Dividends"
      tone-class="border-blue-200 bg-blue-50/60 hover:border-blue-300 hover:bg-blue-100/70 disabled:border-blue-200 disabled:bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30 dark:hover:border-blue-800 dark:hover:bg-blue-900/40 dark:disabled:border-blue-900 dark:disabled:bg-blue-950/30"
      :disabled="!canPayDividends"
      data-test="pay-dividends-button"
      @click="openModal"
    />
=======
      :disabled="!canPayDividends"
      data-test="pay-dividends-button"
      @click="openModal"
    >
      {{ `Pay\nDividends` }}
    </ActionButton>
>>>>>>> Stashed changes

    <UModal
      v-if="modalState.mount"
      v-model:open="modalState.show"
      title="Pay Dividends to the shareholders"
      :description="`Please input amount to divide to the shareholders. This will move funds from bank contract to shareholders based on their share percentage. Only the bank owner can pay dividends.`"
    >
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
import ActionButton from '@/components/sections/SherTokenView/ActionButton.vue'
import { BANK_ABI } from '@/artifacts/abi/bank'
import { useTeamStore, useUserDataStore } from '@/stores'
import { useBodAddAction } from '@/composables/bod/writes'
import { useBodIsBodAction } from '@/composables/bod/reads'
import {
  useDistributeNativeDividends,
  useDistributeTokenDividends
} from '@/composables/bank/writes'
import { useBankOwner } from '@/composables/bank/reads'
import { tokenSymbol as tokenSymbolUtils, tokenSymbolAddresses } from '@/utils'
import { log } from '@/utils'
import type { TokenId } from '@/constant'

interface Props {
  tokenSymbol?: string
  shareholdersCount?: number
  investorsAddress?: Address
  bankAddress?: Address
}

const props = defineProps<Props>()

const { address: currentAddress } = useUserDataStore()
const teamStore = useTeamStore()
const toast = useToast()

const { data: bankOwner, error: bankOwnerError } = useBankOwner()

const modalState = ref({
  mount: false,
  show: false
})

const distributeNativeDividendsWrite = useDistributeNativeDividends()
const distributeTokenDividendsWrite = useDistributeTokenDividends()

const isBankWriteLoading = computed(
  () =>
    distributeNativeDividendsWrite.isPending.value || distributeTokenDividendsWrite.isPending.value
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
<<<<<<< Updated upstream
  const isAuthorized = isBodAction.value || currentAddress === bankOwner.value
=======
  const isAuthorized = isBodAction.value || currentAddress === props.investorsOwner
>>>>>>> Stashed changes
  return hasTokenSymbol && hasShareholders && isAuthorized
})

const cannotPayDividendsReason = computed(() => {
  if (!props.tokenSymbol) return 'Token symbol not available'
  if ((props.shareholdersCount ?? 0) === 0) return 'No shareholders available to pay dividends'
  if (!isBodAction.value && currentAddress !== bankOwner.value) {
    return 'Only the bank owner can pay dividends '
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
    if (selectedTokenId === 'native') {
      await distributeNativeDividendsWrite.mutateAsync({ args: [value] })
    } else {
<<<<<<< Updated upstream
      const tokenAddress = tokenSymbolAddresses[selectedTokenId] as Address
      await distributeTokenDividendsWrite.mutateAsync({ args: [tokenAddress, value] })
=======
      depositTokenAddress.value = tokenSymbolAddresses[selectedTokenId] as Address
      const result = await distributeTokenDividendsWrite.executeWrite([
        depositTokenAddress.value,
        value
      ])
      if (!result) return
>>>>>>> Stashed changes
    }

    closeModal()
  }
}

watch(isActionAdded, (isAdded) => {
  if (isAdded) {
    closeModal()
  }
})

watch(bankOwnerError, (value) => {
  if (value) {
    log.error('Error fetching bank owner', value)
    toast.add({ title: 'Error fetching bank owner', color: 'error' })
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
