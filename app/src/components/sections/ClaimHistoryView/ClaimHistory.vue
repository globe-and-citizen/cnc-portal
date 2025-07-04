<template>
  <div class="flex bg-transparent gap-x-4">
    <!-- Left Sidebar -->
    <CardComponent class="w-1/3">
      <div class="space-y-8">
        <!-- Month Selector -->

        <!-- <pre>{{ currentMonthWeeks }}</pre> -->
        <MonthSelector v-model="selectedMonth" />
        <!-- Week List -->
        <div class="space-y-4">
          <div
            v-for="week in getMonthWeeks(selectedMonth)"
            :key="week.toISOString()"
            @click="selectWeek(week)"
            :class="[
              'border rounded-lg p-3 cursor-pointer',
              week.toISOString() === selectedWeekISO
                ? 'bg-emerald-100 border-emerald-500 text-gray-800'
                : 'hover:bg-gray-50'
            ]"
          >
            <div class="text-sm font-medium">Week</div>
            <div
              class="text-xs"
              :class="week.toISOString() === selectedWeekISO ? 'text-emerald-900' : 'text-gray-800'"
            >
              {{ formatDate(week) }}
            </div>
          </div>
        </div>
      </div>
    </CardComponent>

    <!-- Right Content -->
    <div class="flex-1 space-y-6">
      <TotalValue :weeklyClaim="selectWeekWeelyClaim" />
      <CardComponent title="" class="w-full">
        <div v-if="memberWeeklyClaims">
          <h2 class="pb-4">Weekly Claims: {{ formatDate(selectedWeek) }}</h2>
          <div
            v-for="(entry, index) in [0, 1, 2, 3, 4, 5, 6].map((i) => ({
              date: dayjs(selectedWeek).add(i, 'day').toDate(),
              hours:
                selectWeekWeelyClaim?.claims
                  .filter(
                    (claim) =>
                      formatDayLabel(dayjs(selectedWeek).add(i, 'day').toDate()) ===
                      formatDayLabel(claim.dayWorked)
                  )
                  .reduce((sum, claim) => sum + claim.hoursWorked, 0) || 0
            }))"
            :key="index"
            :class="[
              'flex items-center justify-between border px-4 py-3 mb-2 rounded-lg',
              entry.hours > 0 ? 'bg-green-50 text-green-900' : 'bg-gray-100 text-gray-400'
            ]"
          >
            <div class="flex items-center gap-2">
              <span
                class="h-3 w-3 rounded-full"
                :class="entry.hours > 0 ? 'bg-green-500' : 'bg-gray-300'"
              />
              <span class="font-medium">{{ formatDayLabel(entry.date) }} </span>
            </div>
            <span v-if="entry.hours > 0" class="text-sm text-gray-500">
              ({{
                selectWeekWeelyClaim?.claims.find(
                  (claim) =>
                    formatDayLabel(dayjs(selectedWeek).add(index, 'day').toDate()) ===
                    formatDayLabel(claim.dayWorked)
                )?.memo || ''
              }})
            </span>
            <div class="text-sm flex items-center gap-2">
              <IconifyIcon icon="heroicons:clock" class="w-4 h-4 text-gray-500" />
              {{ entry.hours }} hours
            </div>
          </div>
        </div>
      </CardComponent>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { Icon as IconifyIcon } from '@iconify/vue'
import { getMondayStart, getSundayEnd, getMonthWeeks } from '@/utils/dayUtils'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useTeamStore, useUserDataStore } from '@/stores'
import CardComponent from '@/components/CardComponent.vue'
import MonthSelector from '@/components/MonthSelector.vue'
import TotalValue from '@/components/TotalValue.vue'

const userStore = useUserDataStore()

const teamStore = useTeamStore()
const teamId = computed(() => teamStore.currentTeam?.id)
const weeklyClaimUrl = computed(
  () => `/weeklyClaim/?teamId=${teamId.value}&memberAddress=${userStore.address}`
)

type WeeklyClaimResponse = {
  weekStart: string
  claims: {
    dayWorked: string | Date
    hoursWorked: number
    memo?: string
  }[]
  hourlyRate: number
}
const { data: memberWeeklyClaims } = useCustomFetch(weeklyClaimUrl, {
  immediate: true,
  refetch: true
}).json<Array<WeeklyClaimResponse>>()
const selectedMonth = ref<Date>(dayjs().startOf('month').toDate())
const selectedWeek = ref<Date>(dayjs().startOf('week').toDate())
const selectedWeekISO = computed(() => (selectedWeek.value ? selectedWeek.value.toISOString() : ''))

// function getTotalHoursWorked(claimsArr: { hours: number }[]) {
//   return claimsArr.reduce((sum, claim) => sum + (claim.hours || 0), 0)
// }

const selectWeek = (week: Date) => {
  selectedWeek.value = week
}
const selectWeekWeelyClaim = computed(() => {
  return memberWeeklyClaims.value?.find(
    (weeklyClaim) => weeklyClaim.weekStart === selectedWeekISO.value
  )
})

watch(
  selectedMonth,
  (newMonth) => {
    const weeks = getMonthWeeks(newMonth)
    const currentWeekStart = dayjs().startOf('week').toDate()
    const found = weeks.find((week) => week.toISOString() === currentWeekStart.toISOString())
    if (found) {
      selectedWeek.value = found
    } else {
      selectedWeek.value = weeks[0]
    }
  },
  { immediate: true }
)

function formatDate(date: string | Date) {
  const monday = getMondayStart(new Date(date))
  const sunday = getSundayEnd(new Date(date))
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const locale = 'en-US'
  return `${monday.toLocaleDateString(locale, options)}-${sunday.toLocaleDateString(locale, options)}`
}

function formatDayLabel(date: string | Date) {
  const d = new Date(date)
  const locale = 'en-US'
  const day = d.toLocaleDateString(locale, { weekday: 'long' })
  const dayNum = d.getDate()
  const month = d.toLocaleDateString(locale, { month: 'long' })
  return `${day} ${dayNum} ${month}`
}
</script>
