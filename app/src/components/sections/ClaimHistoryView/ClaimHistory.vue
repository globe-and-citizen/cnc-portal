<template>
  <div v-if="selectedMemberAddress">
    <ClaimHistoryMemberHeader :member-address="selectedMemberAddress" />
    <div class="flex gap-x-4 bg-transparent">
      <!-- Left Sidebar -->
      <ClaimHistoryWeekNavigator
        v-model="selectedMonthObject"
        :member-address="selectedMemberAddress"
      />

      <!-- Right Content -->
      <div class="flex-1 space-y-6">
        <WeeklyRecap :weekly-claim="selectWeekWeelyClaim" :wage="selectedMemberWage" />

        <ClaimHistoryActionAlerts
          :weekly-claim="selectWeekWeelyClaim"
          :member-address="selectedMemberAddress"
          :selected-week-start="selectedMonthObject.isoString"
        />

        <ClaimHistoryDailyBreakdown
          :weekly-claim="selectWeekWeelyClaim"
          :selected-week="selectedMonthObject"
          :member-address="selectedMemberAddress"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { formatIsoWeekRange, startOfWeek, type Week } from '@/utils/dayUtils'
import { useTeamStore } from '@/stores'
import { useRoute } from 'vue-router'
import { useGetTeamWeeklyClaimsQuery, useGetTeamWagesQuery } from '@/queries'
import type { Address } from 'viem'

import WeeklyRecap from './WeeklyRecap.vue'
import ClaimHistoryMemberHeader from './ClaimHistoryMemberHeader.vue'
import ClaimHistoryWeekNavigator from './ClaimHistoryWeekNavigator.vue'
import ClaimHistoryActionAlerts from './ClaimHistoryActionAlerts.vue'
import ClaimHistoryDailyBreakdown from './ClaimHistoryDailyBreakdown.vue'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const route = useRoute()
const teamStore = useTeamStore()

const selectedMemberAddress = computed(() => route.params.memberAddress as Address | undefined)

const currentWeekStart = startOfWeek(dayjs.utc())

const selectedMonthObject = ref<Week>({
  year: currentWeekStart.year(),
  month: currentWeekStart.month(),
  isoWeek: currentWeekStart.isoWeek(),
  isoString: currentWeekStart.toISOString(),
  formatted: formatIsoWeekRange(currentWeekStart)
})

const { data: memberWeeklyClaims } = useGetTeamWeeklyClaimsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    userAddress: selectedMemberAddress
  }
})

const { data: teamWageData } = useGetTeamWagesQuery({
  queryParams: { teamId: computed(() => teamStore.currentTeamId) }
})

const selectWeekWeelyClaim = computed(() => {
  return memberWeeklyClaims.value?.find(
    (weeklyClaim) => weeklyClaim.weekStart === selectedMonthObject.value.isoString
  )
})

const selectedMemberWage = computed(() => {
  return teamWageData.value?.find((wage) => wage.userAddress === selectedMemberAddress.value)
})

defineExpose({
  selectedMemberAddress,
  selectedMonthObject,
  selectWeekWeelyClaim,
  selectedMemberWage
})
</script>
