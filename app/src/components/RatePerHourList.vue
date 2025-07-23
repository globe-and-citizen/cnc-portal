<template>
  <div class="flex">
    <span v-for="(rate, index) in ratePerHour" :key="rate.type">
      {{ rate.amount }}{{ rate.type == 'native' ? currencySymbol : rate.type.toUpperCase()
      }}<span v-if="index < ratePerHour.length - 1">, </span>
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  ratePerHour: Array<{ type: string; amount: number }>
  currencySymbol?: string
}>()
</script>

<style scoped>
.flex {
  display: flex;
  gap: 0.25rem;
}
</style>
