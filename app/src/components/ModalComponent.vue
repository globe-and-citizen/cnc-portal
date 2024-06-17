<template>
  <dialog
    id="custom-modal"
    class="modal modal-bottom sm:modal-middle"
    :class="{ 'modal-open': toggleOpen }"
  >
    <div class="modal-box">
      <button class="btn btn-sm absolute right-4 top-4" @click="toggleOpen = false">✕</button>
      <slot></slot>
    </div>

    <form method="dialog" class="modal-backdrop" @click="toggleOpen = false">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const toggleOpen = defineModel({ default: false })

const handleEscapePress = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    toggleOpen.value = false
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
