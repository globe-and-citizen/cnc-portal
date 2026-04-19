<template>
  <div class="flex flex-col">
    <span v-for="(rate, index) in ratePerHour" :key="rate.type">
      {{ formatCryptoAmount(Number(rate.amount) * Number(totalHours))
      }}{{ rate.type == 'native' ? currencySymbol : rate.type.toUpperCase()
      }}<span v-if="index < ratePerHour.length - 1">, </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { formatCryptoAmount } from '@/utils/currencyUtil'

defineProps<{
  ratePerHour: Array<{ type: string; amount: number }>
  currencySymbol?: string
  totalHours: number
}>()
</script>

<style scoped>
.flex {
  display: flex;
  gap: 0.25rem;
}
.mr-1 {
  margin-right: 0.25rem;
}
</style>
