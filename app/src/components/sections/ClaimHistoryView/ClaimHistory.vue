<template>
  <div v-if="memberAddress">
    <ClaimHistoryMemberHeader :member-address="memberAddress" />
    <div class="flex bg-transparent gap-x-4">
      <!-- Left Sidebar -->
      <ClaimHistoryWeekNavigator v-model="selectedMonthObject" :member-address="memberAddress" />

      <!-- Right Content -->
      <div class="flex-1 space-y-6">
        <WeeklyRecap :weekly-claim="selectWeekWeelyClaim" />

        <ClaimHistoryActionAlerts
          :weekly-claim="selectWeekWeelyClaim"
          :member-address="memberAddress"
        />

        <ClaimHistoryDailyBreakdown
          :weekly-claim="selectWeekWeelyClaim"
          :selected-week="selectedMonthObject"
          :member-address="memberAddress"
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
import { formatIsoWeekRange, type Week } from '@/utils/dayUtils'
import { useTeamStore } from '@/stores'
import { useRoute } from 'vue-router'
import { useGetTeamWeeklyClaimsQuery } from '@/queries'
import type { Address } from 'viem'

import WeeklyRecap from '@/components/WeeklyRecap.vue'
import ClaimHistoryMemberHeader from './ClaimHistoryMemberHeader.vue'
import ClaimHistoryWeekNavigator from './ClaimHistoryWeekNavigator.vue'
import ClaimHistoryActionAlerts from './ClaimHistoryActionAlerts.vue'
import ClaimHistoryDailyBreakdown from './ClaimHistoryDailyBreakdown.vue'

dayjs.extend(utc)
dayjs.extend(isoWeek)

const route = useRoute()
const teamStore = useTeamStore()

const memberAddress = computed(() => route.params.memberAddress as Address | undefined)

const selectedMonthObject = ref<Week>({
  year: dayjs().utc().year(),
  month: dayjs().utc().month(),
  isoWeek: dayjs().utc().isoWeek(),
  isoString: dayjs().utc().startOf('isoWeek').toISOString(),
  formatted: formatIsoWeekRange(dayjs().utc().startOf('isoWeek'))
})

const { data: memberWeeklyClaims } = useGetTeamWeeklyClaimsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    userAddress: memberAddress
  }
})

const selectWeekWeelyClaim = computed(() => {
  return memberWeeklyClaims.value?.find(
    (weeklyClaim) => weeklyClaim.weekStart === selectedMonthObject.value.isoString
  )
})
</script>
