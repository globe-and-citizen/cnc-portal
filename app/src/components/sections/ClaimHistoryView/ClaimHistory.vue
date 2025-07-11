<template>
  <div class="flex bg-transparent gap-x-4">
    <!-- Left Sidebar -->
    <CardComponent class="w-1/3">
      <div class="space-y-8">
        <!-- Month Selector -->

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
                ? 'bg-emerald-50 border-emerald-500 text-gray-800'
                : 'hover:bg-gray-50'
            ]"
          >
            <div class="text-base font-medium">Week</div>
            <div
              class="text-sm"
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
      <WeeklyRecap :weeklyClaim="selectWeekWeelyClaim" />
      <CardComponent title="" class="w-full">
        <div v-if="memberWeeklyClaims">
          <h2 class="pb-4">Weekly Claims: {{ formatDate(selectedWeek) }}</h2>
          <div
            v-for="(entry, index) in [0, 1, 2, 3, 4, 5, 6].map((i) => {
              const date = dayjs(selectedWeek).add(i, 'day').toDate()
              const dailyClaims =
                selectWeekWeelyClaim?.claims.filter(
                  (claim) => formatDayLabel(date) === formatDayLabel(claim.dayWorked)
                ) || []
              return {
                date,
                claims: dailyClaims,
                hours: dailyClaims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
              }
            })"
            :key="index"
            :class="[
              'flex items-center justify-between border px-4 py-3 mb-2 rounded-lg ',
              entry.hours > 0 ? 'bg-green-50 text-emerald-700' : 'bg-gray-100 text-gray-400'
            ]"
          >
            <div class="flex items-center gap-2 w-1/5">
              <span
                class="h-3 w-3 rounded-full"
                :class="entry.hours > 0 ? 'bg-emerald-700' : 'bg-gray-300'"
              />
              <span class="font-medium">{{ formatDayLabel(entry.date) }} </span>
            </div>

            <div v-if="entry.hours > 0" class="text-sm text-gray-500 w-3/5 pl-10 space-y-1">
              <div v-for="(claim, idx) in entry.claims" :key="idx">{{ claim.memo }} ...</div>
            </div>

            <div class="text-base flex items-center gap-2 w-1/5 justify-end">
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
import { useTeamStore } from '@/stores'
import CardComponent from '@/components/CardComponent.vue'
import MonthSelector from '@/components/MonthSelector.vue'
import WeeklyRecap from '@/components/WeeklyRecap.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const teamStore = useTeamStore()
const teamId = computed(() => teamStore.currentTeam?.id)
const memberAddress = route.params.memberAddress as string | undefined

const weeklyClaimUrl = computed(
  () => `/weeklyClaim/?teamId=${teamId.value}&memberAddress=${memberAddress}`
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
    const currentWeekStart = getMondayStart(new Date())
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
