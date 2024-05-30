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

const { addToast } = useToastStore()

const showInfoToast = () => {
  addToast({
    message: 'This is an info toast!',
    type: ToastType.Info,
    timeout: 50000
  })
}

const showSuccessToast = () => {
  addToast({
    message: 'This is a success toast!',
    type: ToastType.Success,
    timeout: 25000
  })
}

const showWarningToast = () => {
  addToast({
    message: 'This is a warning toast!',
    type: ToastType.Warning,
    timeout: 15000
  })
}

const showErrorToast = () => {
  addToast({
    message: 'This is an error toast!',
    type: ToastType.Error,
    timeout: 5000
  })
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
