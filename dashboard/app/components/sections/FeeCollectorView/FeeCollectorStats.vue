<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <UCard v-for="card in statCards" :key="card.label">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">{{ card.label }}</p>
          <p class="text-2xl font-bold mt-1">{{ card.value }}</p>
        </div>

        <div
          class="w-12 h-12 rounded-full flex items-center justify-center"
          :class="card.bg"
        >
          <UIcon :name="card.icon" class="w-6 h-6" :class="card.iconColor" />
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatEther } from 'viem'

interface Props {
  nativeBalance: bigint
}

const props = defineProps<Props>()

const statCards = computed(() => [
  {
    label: 'Total Balance',
    value: `${formatEther(props.nativeBalance || 0n)} ETH`,
    icon: 'i-heroicons-wallet',
    bg: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Pending Withdrawals',
    value: '0.00',
    icon: 'i-heroicons-clock',
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    label: 'Total Withdrawn',
    value: '0.00',
    icon: 'i-heroicons-arrow-down-tray',
    bg: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
  },
])
</script>