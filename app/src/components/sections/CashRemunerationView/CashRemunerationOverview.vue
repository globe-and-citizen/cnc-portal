<template>
  <div class="flex gap-10">
    <OverviewCard title="73.9K USD" variant="success" subtitle="Total Balance" :card-icon="bagIcon">
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 41.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
    <OverviewCard title="10.2K" subtitle="Month Claimed" variant="warning" :card-icon="cartIcon">
      <div class="flex flex-row gap-1 text-black">
        <img :src="uptrendIcon" alt="status-icon" />
        <div>
          <span class="font-semibold text-sm" data-test="percentage-increase">+ 26.3% </span>
          <span class="font-medium text-[#637381] text-xs">than last week</span>
        </div>
      </div>
    </OverviewCard>
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
import bagIcon from '@/assets/bag.svg'
import cartIcon from '@/assets/cart.svg'
import personIcon from '@/assets/person.svg'
import uptrendIcon from '@/assets/uptrend.svg'
import OverviewCard from '@/components/OverviewCard.vue'
</script>
