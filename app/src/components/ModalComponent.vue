<template>
  <dialog id="custom-modal" class="modal" :class="{ 'modal-open': toggleOpen }">
    <div class="modal-box h-auto overflow-y-auto" :class="width">
      <ButtonUI
        class="absolute right-4 top-4"
        size="sm"
        variant="primary"
        outline
        @click="closeWithReset"
        data-test="modal-close-button"
        >✕</ButtonUI
      >
      <slot></slot>
    </div>

    <form method="dialog" class="modal-backdrop" @click="closeWithoutReset">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'

const toggleOpen = defineModel({ default: false })
const props = defineProps<{ modalWidth?: string }>()
const emits = defineEmits(['closeWithReset', 'closeWithoutReset'])

const width = computed(() => {
  return props.modalWidth || ''
})

const closeWithReset = () => {
  toggleOpen.value = false
  emits('closeWithReset')
}

const closeWithoutReset = () => {
  toggleOpen.value = false
  emits('closeWithoutReset')
}

const handleEscapePress = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeWithoutReset()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscapePress)
})
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapePress)
})
</script>

<style scoped></style>
