<template>
  <div class="flex">
    <span v-for="(rate, index) in ratePerHour" :key="rate.type">
      {{ Number(rate.amount) * Number(totalHours) || 0
      }}{{ rate.type == 'native' ? currencySymbol : rate.type.toUpperCase()
      }}<span v-if="index < ratePerHour.length - 1">, </span>
    </span>
  </div>
</template>

<script setup lang="ts">
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
