<template>
  <div class="flex">
    <span v-for="(rate, index) in ratePerHour" :key="rate.type" class="mr-1">
      {{ Number(rate.amount) * Number(totalHours) || 0 }}
      {{ rate.type == 'native' ? currencySymbol : rate.type.toUpperCase() }}
      {{ index < ratePerHour.length - 1 ? ',' : '' }}
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
