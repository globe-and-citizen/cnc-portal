<template>
  <UCard class="min-w[280px] flex flex-col justify-between" data-test="week-navigator">
    <div class="space-y-8">
      <!-- Month Selector -->
      <MonthSelector v-model="internalSelectedWeek" />

      <!-- Week List -->
      <div class="space-y-4 z-0">
        <div
          v-for="week in generatedMonthWeek"
          :key="week.isoWeek"
          @click="internalSelectedWeek = week"
          :class="[
            'border rounded-lg p-3 cursor-pointer',
            week.isoWeek === internalSelectedWeek.isoWeek
              ? 'bg-emerald-50 border-emerald-500 text-gray-800'
              : 'hover:bg-gray-50'
          ]"
        >
          <div class="text-base font-medium flex items-center justify-between">
            Week
            <div
              class="badge badge-outline gap-3"
              v-if="memberWeeklyClaims?.some((wc) => wc.weekStart === week.isoString)"
              :class="`badge-${getColor(
                memberWeeklyClaims?.find((wc) => wc.weekStart === week.isoString)
              )}`"
            >
              {{ memberWeeklyClaims?.find((wc) => wc.weekStart === week.isoString)?.status }}
              <span
                class="h-3 w-3 rounded-full"
                :class="`bg-${getColor(
                  memberWeeklyClaims?.find((wc) => wc.weekStart === week.isoString)
                )}`"
              />
            </div>
          </div>

          <div
            class="text-sm"
            :class="
              week.isoWeek === internalSelectedWeek.isoWeek ? 'text-emerald-900' : 'text-gray-800'
            "
          >
            {{ week.formatted }}
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
import type { WeeklyClaim } from '@/types'
import MonthSelector from '@/components/MonthSelector.vue'

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

const getColor = (weeklyClaim?: WeeklyClaim) => {
  if (!weeklyClaim) return 'accent'
  if (weeklyClaim.status === 'pending') return 'primary'
  if (weeklyClaim.status === 'signed') return 'warning'
  if (weeklyClaim.status === 'withdrawn') return 'info'
  return 'accent'
}

const selectWeekWeelyClaim = computed(() =>
  memberWeeklyClaims.value?.find(
    (weeklyClaim) => weeklyClaim.weekStart === internalSelectedWeek.value.isoString
  )
)

const barChartOption = computed(() => {
  const regularData: { value: number; itemStyle: object }[] = []
  const overtimeData: number[] = []
  const labels: string[] = []
  const weekStart = dayjs(internalSelectedWeek.value.isoString).utc().startOf('isoWeek')
  const maxRegularHours = selectWeekWeelyClaim.value?.wage?.maximumHoursPerWeek ?? Infinity
  let cumulativeHours = 0

  for (let i = 0; i < 7; i++) {
    const date = weekStart.add(i, 'day')
    labels.push(dayjs(date).format('dd'))
    const dailyHours =
      selectWeekWeelyClaim.value?.claims
        .filter((claim) => dayjs(date).isSame(dayjs(claim.dayWorked).utc(), 'day'))
        .reduce((sum: number, claim) => sum + claim.hoursWorked, 0) ?? 0

    const regularBefore = Math.min(cumulativeHours, maxRegularHours)
    const regularAfter = Math.min(cumulativeHours + dailyHours, maxRegularHours)
    const regularToday = regularAfter - regularBefore
    const overtimeToday = dailyHours - regularToday

    regularData.push({
      value: regularToday,
      itemStyle: {
        color: '#10B981',
        borderRadius: overtimeToday > 0 ? [0, 0, 0, 0] : [6, 6, 0, 0]
      }
    })
    overtimeData.push(overtimeToday)
    cumulativeHours += dailyHours
  }

  const totals = regularData.map((r, i) => r.value + (overtimeData?.[i] ?? 0))
  const yMax = Math.max(...totals) > 0 ? Math.max(...totals) : 24

  return {
    title: { text: 'Hours/Day', left: 'center', textStyle: { fontSize: 14 } },
    grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
    tooltip: {
      trigger: 'axis',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any[]) => {
        const day = params[0]?.name ?? ''
        const regularH = params[0]?.value ?? 0
        const overtimeH = params[1]?.value ?? 0
        const total = regularH + overtimeH
        if (overtimeH > 0) {
          return `<b>${day}</b><br/>Regular: ${regularH}h<br/>Overtime: ${overtimeH}h<br/>Total: ${total}h`
        }
        return `<b>${day}</b><br/>${total}h`
      }
    },
    xAxis: { type: 'category', data: labels, axisTick: { alignWithLabel: true } },
    yAxis: { type: 'value', min: 0, max: yMax, axisLabel: { formatter: '{value} h' } },
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
            const total = totals[params.dataIndex]
            return `${total}h`
          }
        }
      }
    ]
  }
})
</script>
