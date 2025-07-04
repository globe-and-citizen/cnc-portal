<template>
  <div class="flex-1 space-y-6">
    <div class="stats shadow w-full">
      <div class="stat place-items-center">
        <div class="stat-title">Total Hours</div>
        <div class="stat-value">{{ totalHour }}h</div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Hourly Rate</div>
        <div class="stat-value text-secondary">{{ hourlyRate }}$</div>
        <div class="stat-desc"></div>
      </div>

      <div class="stat place-items-center">
        <div class="stat-title">Total Amount</div>
        <div class="stat-value">{{ totalAmount }}$</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps(['weeklyClaim'])

const totalHour = computed(() => {
  return props.weeklyClaim?.claims.reduce((sum, claim) => sum + claim.hoursWorked, 0) || 0
})
const hourlyRate = computed(() => {
  return props.weeklyClaim?.hourlyRate || 0
})
const totalAmount = computed(() => {
  return totalHour.value * hourlyRate.value
})
</script>
