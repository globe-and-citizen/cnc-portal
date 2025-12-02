<script setup lang="ts">
import { sub } from 'date-fns'
import type { Period, Range } from '~/types'

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')
</script>

<template>
  <!-- <UDashboardToolbar>
    <template #left>
      NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here.
      <HomeDateRangePicker v-model="range" class="-ms-1" />

      <HomePeriodSelect v-model="period" :range="range" />
    </template>
  </UDashboardToolbar> -->
  <HomeStats :period="period" :range="range" />
  <HomeChart :period="period" :range="range" />
  <!-- <HomeSales :period="period" :range="range" /> -->
</template>
