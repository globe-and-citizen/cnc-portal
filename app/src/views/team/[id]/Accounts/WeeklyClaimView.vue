<template>
  <div class="flex flex-col gap-6">
    <WeeklyClaim />
    <CashRemerationTransactions />
  </div>
</template>

<script setup lang="ts">
import WeeklyClaim from '@/components/sections/WeeklyClaimView/WeeklyClaim.vue'
import CashRemerationTransactions from '@/components/sections/WeeklyClaimView/CashRemerationTransactions.vue'
</script>
