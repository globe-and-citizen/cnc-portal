<template>
  <div :class="{ tooltip: !canMint }" :data-tip="cannotMintReason">
    <ActionButton
      icon="heroicons:plus-circle"
      icon-bg="bg-teal-50 dark:bg-teal-950"
      icon-color="text-teal-700 dark:text-teal-400"
<<<<<<< Updated upstream
      title="Mint"
      tone-class="border-teal-200 bg-teal-50/60 hover:border-teal-300 hover:bg-teal-100/70 disabled:border-teal-200 disabled:bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/30 dark:hover:border-teal-800 dark:hover:bg-teal-900/40 dark:disabled:border-teal-900 dark:disabled:bg-teal-950/30"
      :disabled="!canMint"
      data-test="mint-button"
      @click="openModal"
    />
=======
      :disabled="!canMint"
      data-test="mint-button"
      @click="openModal"
    >
      {{ `Mint\n${tokenSymbol}` }}
    </ActionButton>
>>>>>>> Stashed changes

    <UModal
      v-if="modalState.mount"
      v-model:open="modalState.show"
      :title="`Issue ${tokenSymbol} tokens`"
      description="Allocate new tokens to a shareholder. Their ownership stake is calculated based on the total supply at the time of issuance."
      :close="{ onClick: closeModal }"
    >
      <template #body>
        <MintForm v-model="modalState.show" @close-modal="closeModal" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import MintForm from '@/components/sections/SherTokenView/forms/MintForm.vue'
import ActionButton from '@/components/sections/SherTokenView/ActionButton.vue'
import { useUserDataStore } from '@/stores'

interface Props {
  tokenSymbol: string
  investorsOwner: Address
}

const props = defineProps<Props>()

const { address: currentAddress } = useUserDataStore()

const modalState = ref({
  mount: false,
  show: false
})

const canMint = computed(() => {
  return currentAddress === props.investorsOwner
})

const cannotMintReason = computed(() => {
  if (currentAddress !== props.investorsOwner) return 'Only the token owner can mint tokens'
  return ''
})

const openModal = () => {
  modalState.value = { mount: true, show: true }
}

const closeModal = () => {
  modalState.value = { mount: false, show: false }
}
</script>
