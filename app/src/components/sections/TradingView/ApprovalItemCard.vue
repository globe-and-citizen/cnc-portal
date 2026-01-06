<template>
  <div class="collapse collapse-plus bg-base-200 rounded-xl mb-4">
    <input type="checkbox" />
    <div class="collapse-title text-xl font-medium px-6 py-4">
      <div class="flex items-center gap-3">
        <IconifyIcon :icon="icon" :class="`w-6 h-6 text-${color}`" />
        <div class="text-left">
          <p class="text-lg font-semibold">{{ title }}</p>
          <p class="text-sm text-gray-500">{{ description }}</p>
        </div>
      </div>
    </div>
    <div class="collapse-content px-6 pb-4">
      <div class="space-y-2">
        <div
          v-for="(approval, index) in approvalItems"
          :key="index"
          class="flex items-center justify-between bg-base-300 p-3 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <div
              v-if="symbol"
              class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"
            >
              <span class="font-mono text-xs text-blue-400">{{ symbol }}</span>
            </div>
            <div>
              <p class="text-sm font-medium">{{ approval.name }}</p>
              <p class="font-mono text-xs text-gray-500">
                {{ approval.address.slice(0, 6) }}...{{ approval.address.slice(-4) }}
              </p>
            </div>
          </div>
          <IconifyIcon v-if="isIcon" :icon="value" class="w-4 h-4 text-green-500" />
          <span v-else class="text-primary font-mono text-sm">{{ value }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon as IconifyIcon } from '@iconify/vue'

defineProps<{
  approvalItems: Array<{ name: string; address: string }>
  symbol?: string
  icon: string
  title: string
  description: string
  color: string
  value: string
  isIcon?: boolean
}>()
</script>
