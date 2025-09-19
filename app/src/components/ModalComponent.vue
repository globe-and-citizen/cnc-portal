<template>
  <dialog id="custom-modal" class="modal" :class="{ 'modal-open': toggleOpen }">
    <div class="modal-box h-auto overflow-y-auto" :class="width">
      <ButtonUI
        class="absolute right-4 top-4"
        size="sm"
        variant="primary"
        outline
        data-test="modal-close-button"
        @click="handleCloseButtonClick"
        >✕</ButtonUI
      >
      <slot></slot>
    </div>

    <form method="dialog" class="modal-backdrop" @click="handleBackdropClick">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'

const toggleOpen = defineModel({ default: false })
const props = defineProps<{ modalWidth?: string }>()

const emit = defineEmits<{
  reset: []
  close: [fromBackdrop: boolean]
}>()

const width = computed(() => {
  return props.modalWidth || ''
})

const handleCloseButtonClick = () => {
  console.log('ModalComponent: Close button clicked - emitting reset and close(false)')
  toggleOpen.value = false
  // Toujours réinitialiser quand on clique sur le bouton X
  emit('reset')
  emit('close', false)
}

const handleBackdropClick = () => {
  console.log('ModalComponent: Backdrop clicked - emitting close(true)')
  toggleOpen.value = false
  // Ne pas réinitialiser quand on clique sur l'arrière-plan
  emit('close', true)
}

const handleEscapePress = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    toggleOpen.value = false
    // Treat Escape as clicking the backdrop (no reset)
    emit('close', true)
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscapePress)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapePress)
})
</script>
