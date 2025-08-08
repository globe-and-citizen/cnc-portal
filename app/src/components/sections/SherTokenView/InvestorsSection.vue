<template>
  <div class="flex flex-col gap-y-8">
    <InvestorsHeader />
    <div class="divider m-0"></div>
    <InvestorsActions />
    <div class="divider m-0"></div>
    <ShareholderList />
  </div>
</template>

<script setup lang="ts">
import InvestorsHeader from '@/components/sections/SherTokenView/InvestorsHeader.vue'
import InvestorsActions from '@/components/sections/SherTokenView/InvestorsActions.vue'
import ShareholderList from '@/components/sections/SherTokenView/ShareholderList.vue'
</script>
