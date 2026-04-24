<template>
  <UCard class="flex min-w-[280px] flex-col justify-between" data-test="week-navigator">
    <div class="space-y-8">
      <!-- Month Selector -->
      <MonthSelector v-model="internalSelectedWeek" />

      <!-- Week List -->
      <div class="z-0 space-y-4">
        <div
          v-for="weekItem in monthWeeksWithClaims"
          :key="weekItem.week.isoWeek"
          @click="internalSelectedWeek = weekItem.week"
          :class="[
            'cursor-pointer rounded-lg border p-3',
            weekItem.week.isoWeek === internalSelectedWeek.isoWeek
              ? 'border-emerald-500 bg-emerald-50 text-gray-800'
              : 'hover:bg-gray-50'
          ]"
        >
          <div class="flex items-center justify-between text-base font-medium">
            Week
            <div
              class="badge badge-outline gap-3"
              v-if="weekItem.claim"
              :class="`badge-${weekItem.color}`"
            >
              {{ weekItem.claim.status }}
              <span class="h-3 w-3 rounded-full" :class="`bg-${weekItem.color}`" />
            </div>
          </div>

          <div
            class="text-sm"
            :class="
              weekItem.week.isoWeek === internalSelectedWeek.isoWeek
                ? 'text-emerald-900'
                : 'text-gray-800'
            "
          >
            {{ weekItem.week.formatted }}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer (optionnel pour ton chart) -->

    <div class="mt-10">
      <v-chart :option="barChartOption" autoresize style="height: 250px" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Address } from 'viem'
import { getMonthWeeks, type Week } from '@/utils/dayUtils'
import { useTeamStore } from '@/stores'
import { useGetTeamWeeklyClaimsQuery } from '@/queries'
import MonthSelector from '@/components/MonthSelector.vue'
import { formatMinutesAsDuration } from '@/utils/wageUtil'
import {
  formatWeekTooltipText,
  getClaimStatusColor
} from '@/utils/claimHistoryWeekNavigator'

import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, BarChart, CanvasRenderer])
dayjs.extend(utc)
dayjs.extend(isoWeek)

interface Props {
  memberAddress: Address
}

const props = defineProps<Props>()
const internalSelectedWeek = defineModel<Week>({ required: true })
const teamStore = useTeamStore()

const { data: memberWeeklyClaims } = useGetTeamWeeklyClaimsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    userAddress: computed(() => props.memberAddress)
  }
})

const generatedMonthWeek = computed(() =>
  getMonthWeeks(internalSelectedWeek.value.year, internalSelectedWeek.value.month)
)

const getColor = getClaimStatusColor

const weeklyClaimsByStart = computed(() => {
  const claims = memberWeeklyClaims.value ?? []
  return new Map(claims.map((claim) => [claim.weekStart, claim] as const))
})

const monthWeeksWithClaims = computed(() =>
  generatedMonthWeek.value.map((week) => {
    const claim = weeklyClaimsByStart.value.get(week.isoString)
    return {
      week,
      claim,
      color: getColor(claim)
    }
  })
)

const selectedWeekWeeklyClaim = computed(() =>
  weeklyClaimsByStart.value.get(internalSelectedWeek.value.isoString)
)

const barChartOption = computed(() => {
  const regularData: { value: number; itemStyle: object }[] = []
  const overtimeData: number[] = []
  const regularMinutesData: number[] = []
  const overtimeMinutesData: number[] = []
  const labels: string[] = []
  const weekStart = dayjs(internalSelectedWeek.value.isoString).utc().startOf('isoWeek')
  const maxRegularHours = selectedWeekWeeklyClaim.value?.wage?.maximumHoursPerWeek ?? Infinity
  let cumulativeMinutes = 0

  for (let i = 0; i < 7; i++) {
    const date = weekStart.add(i, 'day')
    labels.push(dayjs(date).format('dd'))
    const dailyTimes =
      selectedWeekWeeklyClaim.value?.claims
        .filter((claim) => dayjs(date).isSame(dayjs(claim.dayWorked).utc(), 'day'))
        .reduce((sum: number, claim) => sum + claim.minutesWorked, 0) ?? 0

    const maxRegularMinutes = maxRegularHours * 60
    const regularBefore = Math.min(cumulativeMinutes, maxRegularMinutes)
    const regularAfter = Math.min(cumulativeMinutes + dailyTimes, maxRegularMinutes)
    const regularTodayMinutes = regularAfter - regularBefore
    const overtimeTodayMinutes = dailyTimes - regularTodayMinutes

    const regularTodayHours = regularTodayMinutes / 60
    const overtimeTodayHours = overtimeTodayMinutes / 60

    regularMinutesData.push(regularTodayMinutes)
    overtimeMinutesData.push(overtimeTodayMinutes)

    regularData.push({
      value: regularTodayHours,
      itemStyle: {
        color: '#10B981',
        borderRadius: overtimeTodayHours > 0 ? [0, 0, 0, 0] : [6, 6, 0, 0]
      }
    })
    overtimeData.push(overtimeTodayHours)
    cumulativeMinutes += dailyTimes
  }

  const totals = regularData.map((r, i) => r.value + (overtimeData?.[i] ?? 0))
  const totalMinutesPerDay = regularMinutesData.map((r, i) => r + (overtimeMinutesData?.[i] ?? 0))
  const yMax = Math.max(...totals) > 0 ? Math.max(...totals) : 24

  return {
    title: { text: 'Hours/Day', left: 'center', textStyle: { fontSize: 14 } },
    grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
    tooltip: {
      trigger: 'axis',
      renderMode: 'richText',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any[]) => {
        const day = params[0]?.name ?? ''
        const idx = params[0]?.dataIndex ?? 0
        const totalMin = totalMinutesPerDay[idx] ?? 0
        const regularMin = regularMinutesData[idx] ?? 0
        const overtimeMin = overtimeMinutesData[idx] ?? 0
        return formatWeekTooltipText(day, totalMin, regularMin, overtimeMin)
      }
    },
    xAxis: { type: 'category', data: labels, axisTick: { alignWithLabel: true } },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      axisLabel: { formatter: (val: number) => `${parseFloat(val.toFixed(1))} h` }
    },
    series: [
      {
        name: 'Regular',
        type: 'bar',
        stack: 'hours',
        barWidth: '50%',
        data: regularData,
        label: { show: false }
      },
      {
        name: 'Overtime',
        type: 'bar',
        stack: 'hours',
        barWidth: '50%',
        data: overtimeData,
        // Changed from #EF4444 (red) to #F59E0B (amber) for consistency with badge
        itemStyle: { color: '#F59E0B', borderRadius: [6, 6, 0, 0] },
        label: {
          show: true,
          position: 'top',
          color: '#374151',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (params: any) => {
            const totalMin = totalMinutesPerDay[params.dataIndex] ?? 0
            return totalMin > 0 ? formatMinutesAsDuration(totalMin) : ''
          }
        }
      }
    ]
  }
})
</script>
