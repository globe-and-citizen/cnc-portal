<template>
  <div class="grid grid-cols-1 gap-4">
    <UCard>
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Total Balance (USD)
          </p>
          <p class="text-2xl font-bold mt-1">
            <span v-if="isLoading">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            </span>
            <span v-else-if="error" class="text-red-600 dark:text-red-400 text-base">
              Failed to load balance
            </span>
            <span v-else>{{ formattedTotalUsd }}</span>
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span v-if="error">Please try again later</span>
            <span v-else>Available to withdraw</span>
          </p>
        </div>

        <div class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900">
          <UIcon name="i-heroicons-wallet" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useFeeCollector } from '@/composables/useFeeCollector'

// Get total USD directly from composable
const {
  isLoading,
  error,
  formattedTotalUsd } = useFeeCollector()
</script>
