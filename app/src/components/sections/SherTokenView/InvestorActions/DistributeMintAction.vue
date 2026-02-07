<template>
  <div
    :class="{ tooltip: !canDistributeMint }"
    data-tip="Coming soon"
  >
    <ButtonUI
      variant="primary"
      :disabled="true"
      data-test="distribute-mint-button"
      @click="openModal"
    >
      Distribute Mint {{ tokenSymbol }}
    </ButtonUI>

    <ModalComponent
      v-model="modalState.show"
      v-if="modalState.mount"
      @reset="closeModal"
    >
      <DistributeMintForm
        v-if="modalState.show"
        :loading="isLoading || isConfirming"
        :token-symbol="tokenSymbol"
        @submit="handleSubmit"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import DistributeMintForm from '@/components/sections/SherTokenView/forms/DistributeMintForm.vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investorsV1'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { useToastStore } from '@/stores'
import { log } from '@/utils'

interface Props {
  tokenSymbol: string
  investorsAddress: Address
}

const props = defineProps<Props>()
const emit = defineEmits<{
  refetchShareholders: []
}>()

const { addErrorToast, addSuccessToast } = useToastStore()

const modalState = ref({
  mount: false,
  show: false
})

const {
  data: distributeMintHash,
  writeContract: distributeMint,
  isPending: isLoading,
  error: distributeMintError
} = useWriteContract()

const { isLoading: isConfirming, isSuccess: isSuccessDistributing } =
  useWaitForTransactionReceipt({
    hash: distributeMintHash
  })

const canDistributeMint = true // Toujours à true pour l'instant (coming soon)

const openModal = () => {
  modalState.value = { mount: true, show: true }
}

const closeModal = () => {
  modalState.value = { mount: false, show: false }
}

const handleSubmit = (
  shareholders: ReadonlyArray<{
    readonly shareholder: Address
    readonly amount: bigint
  }>
) => {
  if (!props.investorsAddress) return

  distributeMint({
    abi: INVESTOR_ABI,
    address: props.investorsAddress,
    functionName: 'distributeMint',
    args: [shareholders]
  })
}

watch(distributeMintError, () => {
  if (distributeMintError.value) {
    log.error('Failed to distribute mint', distributeMintError.value)
    addErrorToast('Failed to distribute mint')
  }
})

watch([isConfirming, isSuccessDistributing], ([newIsConfirming, newIsSuccess]) => {
  if (!newIsConfirming && newIsSuccess) {
    emit('refetchShareholders')
    addSuccessToast('Distributed mint successfully')
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
