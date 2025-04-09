<template>
  <div class="flex gap-10">
    <CashRemunerationTotalBalance />
    <CashRemunerationMonthlyClaim />
    <CashRemunerationPendingClaim />
  </div>
</template>
<script setup lang="ts">
import CashRemunerationTotalBalance from '@/components/sections/CashRemunerationView/CashRemunerationTotalBalance.vue'
import CashRemunerationMonthlyClaim from '@/components/sections/CashRemunerationView/CashRemunerationMonthlyClaim.vue'
import CashRemunerationPendingClaim from '@/components/sections/CashRemunerationView/CashRemunerationPendingClaim.vue'
</script>
