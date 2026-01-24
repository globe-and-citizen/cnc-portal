<template>
  <OverviewCard :title="10" subtitle="Total Approved" variant="info" :card-icon="personIcon">
    <div class="flex flex-row gap-1 text-black">
      <img :src="uptrendIcon" alt="status-icon" />
      <div>
        <span class="font-semibold text-sm" data-test="percentage-increase">+ 12.3% </span>
        <span class="font-medium text-[#637381] text-xs">TODO: Update this</span>
        <!-- <span class="font-medium text-[#637381] text-xs">than last week</span> -->
      </div>
    </div>
  </OverviewCard>
</template>
<script setup lang="ts">
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
</script>
