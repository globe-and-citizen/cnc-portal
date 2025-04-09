<template>
  <div class="flex gap-10">
    <CashRemunerationTotalBalance />
    <CashRemunerationMonthlyClaim />
    <OverviewCard title="47.9K" subtitle="Pending Claim" variant="info" :card-icon="personIcon">
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 12.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
  </div>
</template>
<script setup lang="ts">
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
import CashRemunerationTotalBalance from '@/components/sections/CashRemunerationView/CashRemunerationTotalBalance.vue'
import CashRemunerationMonthlyClaim from '@/components/sections/CashRemunerationView/CashRemunerationMonthlyClaim.vue'
</script>
