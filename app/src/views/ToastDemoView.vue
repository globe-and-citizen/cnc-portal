<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">Toast Notification Demo</h1>
    <div class="grid grid-cols-4 gap-4">
      <button class="btn btn-info" @click="showInfoToast">Info</button>
      <button class="btn btn-success" @click="showSuccessToast">Success</button>
      <button class="btn btn-warning" @click="showWarningToast">Warning</button>
      <button class="btn btn-error" @click="showErrorToast">Error</button>
    </div>
    <ToastContainer position="bottom-center" />
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '@/stores/useToastStore'
import ToastContainer from '@/components/ToastContainer.vue'
import { ToastType } from '@/types'

const { addErrorToast, addSuccessToast, addWarningToast, addInfoToast } = useToastStore()

const showInfoToast = () => {
  addInfoToast('This is an info toast!')
}

const showSuccessToast = () => {
  addSuccessToast('This is a success toast!')
}

const showWarningToast = () => {
  addWarningToast('This is a warning toast!')
}

const showErrorToast = () => {
  addErrorToast('This is an error toast!')
}
</script>

<style scoped>
.container {
  max-width: 1200px;
}
.grid {
  gap: 1rem;
}
</style>
