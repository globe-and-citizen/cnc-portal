<template>
  <div class="flex bg-transparent gap-x-4">
    <!-- Left Sidebar -->
    <CardComponent class="w-1/2">
      <div class="space-y-8">
        <!-- Month Selector -->

        <!-- <pre>{{ currentMonthWeeks }}</pre> -->
        <MonthSelector v-model="selectedMonth" />
        <!-- Week List -->
        <div class="space-y-4">
          <div
            v-for="week in getMonthWeeks(selectedMonth)"
            :key="week"
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
      <div class="stats shadow w-full">
        <div class="stat place-items-center">
          <div class="stat-title">Total Hours</div>
          <div class="stat-value">{{ totalHours }}h</div>
        </div>

        <div class="stat place-items-center">
          <div class="stat-title">Hourly Rate</div>
          <div class="stat-value text-secondary">{{ hourlyRate }}$</div>
          <div class="stat-desc">10 USDC, 10 POL, 10 SHER</div>
        </div>

        <div class="stat place-items-center">
          <div class="stat-title">Total Amount</div>
          <div class="stat-value">{{ totalAmount }}$</div>
        </div>
      </div>

      <CardComponent title="" class="w-full">
        <div v-if="memberWeeklyClaims">
          <h2 class="pb-4">Weekly Claims: {{ formatDate(claims.start) }}</h2>

          <div
            v-for="(entry, index) in memberWeeklyClaims.claims"
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
              <span class="text-sm text-gray-500">({{ entry.hours }}h)</span>
            </div>
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
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { Icon as IconifyIcon } from '@iconify/vue'
import { getMondayStart, getSundayEnd, getMonthWeeks } from '@/utils/dayUtils'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useTeamStore } from '@/stores'
import CardComponent from '@/components/CardComponent.vue'
import MonthSelector from '@/components/MonthSelector.vue'

const teamStore = useTeamStore()
const teamId = computed(() => teamStore.currentTeam?.id)
const weeklyClaimUrl = computed(() => `/claim/?teamId=${teamId.value}`)

const { data: memberWeeklyClaims } = useCustomFetch(weeklyClaimUrl, {
  immediate: true,
  refetch: true
}).json<Array<weeklyClaimResponse>>()
const selectedMonth = ref<Date>(dayjs().startOf('month').toDate())
const selectedWeek = ref<Date>(dayjs().startOf('week').toDate())
const selectedWeekISO = computed(() => (selectedWeek.value ? selectedWeek.value.toISOString() : ''))
const hourlyRate = 20

// function getTotalHoursWorked(claimsArr: { hours: number }[]) {
//   return claimsArr.reduce((sum, claim) => sum + (claim.hours || 0), 0)
// }

const selectWeek = (week) => {
  selectedWeek.value = week
}

function formatDate(date: string | Date) {
  const monday = getMondayStart(new Date(date))
  const sunday = getSundayEnd(new Date(date))
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const locale = navigator.language || 'en-US'
  return `${monday.toLocaleDateString(locale, options)}-${sunday.toLocaleDateString(locale, options)}`
}

function formatDayLabel(date: string | Date) {
  const d = new Date(date)
  const locale = navigator.language || 'en-US'
  const day = d.toLocaleDateString(locale, { weekday: 'long' })
  const dayNum = d.getDate()
  const month = d.toLocaleDateString(locale, { month: 'long' })
  return `${day} ${dayNum} ${month}`
}
</script>
