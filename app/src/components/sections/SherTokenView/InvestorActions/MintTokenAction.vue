<template>
  <div :class="{ tooltip: !canMint }" :data-tip="cannotMintReason">
    <ActionButton
      icon="heroicons:plus-circle"
      icon-bg="bg-teal-50 dark:bg-teal-950"
      icon-color="text-teal-700 dark:text-teal-400"
      :disabled="!canMint"
      data-test="mint-button"
      @click="openModal"
    >
      {{ `Mint\n${tokenSymbol}` }}
    </ActionButton>

    <UModal
      v-if="modalState.mount"
      v-model:open="modalState.show"
      title="Mint Tokens"
      description="Mint new tokens to be distributed to shareholders from the token contract."
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
