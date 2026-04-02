<template>
  <div :class="{ tooltip: !canMint }" :data-tip="cannotMintReason">
    <UButton
      color="primary"
      variant="outline"
      data-test="mint-button"
      :disabled="!canMint"
      @click="openModal"
      :label="`Mint ${tokenSymbol}`"
    />

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
