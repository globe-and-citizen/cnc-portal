<template>
  <div class="tooltip" data-tip="Coming soon">
    <UButton
      color="primary"
      :disabled="true"
      data-test="distribute-mint-button"
      @click="openModal"
      :label="`Distribute Mint ${tokenSymbol}`"
    />

    <UModal v-if="modalState.mount" v-model:open="modalState.show">
      <template #body>
        <DistributeMintForm
          v-if="modalState.show"
          :loading="isLoading || isConfirming"
          :token-symbol="tokenSymbol"
          @submit="handleSubmit"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Address } from 'viem'
import DistributeMintForm from '@/components/sections/SherTokenView/forms/DistributeMintForm.vue'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { useWriteContract, useWaitForTransactionReceipt } from '@wagmi/vue'
import { log } from '@/utils'

interface Props {
  tokenSymbol: string
  investorsAddress: Address
}

const props = defineProps<Props>()
const emit = defineEmits<{
  refetchShareholders: []
}>()

const toast = useToast()

const modalState = ref({
  mount: false,
  show: false
})

const {
  data: distributeMintHash,
  mutate: distributeMint,
  isPending: isLoading,
  error: distributeMintError
} = useWriteContract()

const { isLoading: isConfirming, isSuccess: isSuccessDistributing } = useWaitForTransactionReceipt({
  hash: distributeMintHash
})

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
    toast.add({ title: 'Failed to distribute mint', color: 'error' })
  }
})

watch([isConfirming, isSuccessDistributing], ([newIsConfirming, newIsSuccess]) => {
  if (!newIsConfirming && newIsSuccess) {
    emit('refetchShareholders')
    toast.add({ title: 'Distributed mint successfully', color: 'success' })
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
