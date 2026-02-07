<template>
  <div :class="{ tooltip: !canMint }" :data-tip="cannotMintReason">
    <ButtonUI
      variant="primary"
      outline
      data-test="mint-button"
      :disabled="!canMint"
      @click="openModal"
    >
      Mint {{ tokenSymbol }}
    </ButtonUI>

    <ModalComponent
      v-model="modalState.show"
      v-if="modalState.mount"
      @reset="closeModal"
    >
      <MintForm
        v-model="modalState.show"
        @close-modal="closeModal"
      />
    </ModalComponent>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'
import ModalComponent from '@/components/ModalComponent.vue'
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
