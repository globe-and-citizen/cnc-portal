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
          ref="actionAlertsRef"
          :weekly-claim="selectWeekWeelyClaim"
          :member-address="selectedMemberAddress"
          :selected-week-start="selectedMonthObject.isoString"
        />

        <ClaimHistoryDailyBreakdown
          :weekly-claim="selectWeekWeelyClaim"
          :selected-week="selectedMonthObject"
          :member-address="selectedMemberAddress"
          :is-restricted="isRestricted"
          @quick-submit="handleQuickSubmit"
        />

        <WeeklyGoalsDisplay :weekly-claim="selectWeekWeelyClaim" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Week, formatIsoWeekRange, startOfWeek } from '@/utils/dates/calendar'
import { computed, ref } from 'vue'
import { useGetTeamWagesQuery, useGetTeamWeeklyClaimsQuery } from '@/queries'
import type { Address } from 'viem'
import ClaimHistoryActionAlerts from './ClaimHistoryActionAlerts.vue'
import ClaimHistoryDailyBreakdown from './ClaimHistoryDailyBreakdown.vue'
import ClaimHistoryMemberHeader from './ClaimHistoryMemberHeader.vue'
import ClaimHistoryWeekNavigator from './ClaimHistoryWeekNavigator.vue'
import WeeklyGoalsDisplay from './WeeklyGoalsDisplay.vue'
import WeeklyRecap from './WeeklyRecap.vue'

import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useRoute } from 'vue-router'
import { useSubmitRestriction } from '@/composables'
import { useTeamStore } from '@/stores'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const route = useRoute()
const teamStore = useTeamStore()
const { isRestricted } = useSubmitRestriction()

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
  return memberWeeklyClaims.value?.data?.find(
    (weeklyClaim) => weeklyClaim.weekStart === selectedMonthObject.value.isoString
  )
})

const selectedMemberWage = computed(() => {
  return teamWageData.value?.find((wage) => wage.userAddress === selectedMemberAddress.value)
})

type ActionAlertsExposed = {
  openSubmitClaimForDay: (dayIso: string) => void
}

const actionAlertsRef = ref<ActionAlertsExposed | null>(null)

const handleQuickSubmit = (dayIso: string) => {
  actionAlertsRef.value?.openSubmitClaimForDay(dayIso)
}
</script>
