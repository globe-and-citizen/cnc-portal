<template>
  <div class="container mx-auto px-4 py-8 space-y-8">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          Safe Management
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Deploy and manage your Safes
        </p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" @click="isDeployModalOpen = true">
        Deploy New Safe
      </UButton>
    </div>

    <!-- Safe List -->
    <SafeList ref="safeListRef" />

    <!-- Deploy Modal (handled inside SafeDeployForm) -->
    <SafeDeployForm v-model="isDeployModalOpen" @deployed="handleDeployed" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SafeDeployForm from '@/components/sections/Safe/SafeDeployForm.vue'
import SafeList from '@/components/sections/Safe/SafeList.vue'

const toast = useToast()
const isDeployModalOpen = ref(false)
const safeListRef = ref()

function handleDeployed(message?: string) {
  safeListRef.value?.fetchSafes?.()
  if (message) {
    toast.add({
      title: 'Success',
      description: message,
      color: 'success'
    })
  }
}
</script>
