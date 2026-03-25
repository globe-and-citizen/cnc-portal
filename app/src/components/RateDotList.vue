<template>
  <div class="space-y-2">
    <div
      v-for="rate in rates"
      :key="rate.type"
      class="flex items-center gap-1 font-semibold"
      :class="textClass"
    >
      <span
        class="inline-block w-2 h-2 rounded-full flex-shrink-0"
        :class="{
          'bg-yellow-400': rate.type === 'native',
          'bg-blue-500': rate.type === 'usdc',
          'bg-green-500': rate.type === 'usdt',
          'bg-purple-500': !['native', 'usdc', 'usdt'].includes(rate.type)
        }"
      />
      {{ rate.type === 'native' ? NETWORK.currencySymbol : rate.type.toUpperCase() }}
      {{ rate.amount }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { NETWORK } from '@/constant'

defineProps<{
  rates: Array<{ type: string; amount: number }>
  textClass?: string
}>()
</script>
