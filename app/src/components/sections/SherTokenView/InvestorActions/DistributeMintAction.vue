<template>
  <div class="tooltip" data-tip="Coming soon">
    <ActionButton
      icon="heroicons:banknotes"
      icon-bg="bg-green-50 dark:bg-green-950"
      icon-color="text-green-700 dark:text-green-400"
      title="Distribute Mint"
      tone-class="border-green-200 bg-green-50/60 hover:border-green-300 hover:bg-green-100/70 disabled:border-green-200 disabled:bg-green-50/50 dark:border-green-900 dark:bg-green-950/30 dark:hover:border-green-800 dark:hover:bg-green-900/40 dark:disabled:border-green-900 dark:disabled:bg-green-950/30"
      :disabled="true"
      data-test="distribute-mint-button"
      @click="openModal"
    />

    <UModal
      v-if="modalState.mount"
      v-model:open="modalState.show"
      title="Distribute Mint"
      :description="`Distribute minted tokens to shareholders for ${tokenSymbol}.`"
    >
      <template #body>
        <UAlert
          v-if="distributeMintError"
          color="error"
          variant="soft"
          :description="distributeMintError.message"
          class="mb-4"
        />
        <DistributeMintForm
          v-if="modalState.show"
          :loading="isLoading"
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
import ActionButton from '@/components/sections/SherTokenView/ActionButton.vue'
import { useDistributeMint } from '@/composables/investor/writes'
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
  mutate: distributeMint,
  isPending: isLoading,
  error: distributeMintError
} = useDistributeMint()

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

  distributeMint(
    { args: [shareholders] },
    {
      onSuccess: () => {
        emit('refetchShareholders')
        toast.add({ title: 'Distributed mint successfully', color: 'success' })
        closeModal()
      },
      onError: (error) => {
        log.error('Failed to distribute mint', error)
      }
    }
  )
}

watch(
  () => modalState.value.show,
  (newShow) => {
    if (!newShow) {
      closeModal()
    }
  }
)
</script>
