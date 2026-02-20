<template>
  <CardComponent class="min-w[270px] flex flex-col justify-between" data-test="week-navigator">
    <div class="space-y-8">
      <!-- Month Selector -->
      <MonthSelector v-model="internalSelectedWeek" />

      <!-- Week List -->
      <div class="space-y-4 z-0">
        <div
          v-for="week in generatedMonthWeek"
          :key="week.isoWeek"
          @click="
            () => {
              internalSelectedWeek = week
            }
          "
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

    <!-- Graphique à barres (Heures/Jour) -->
    <div class="mt-6">
      <v-chart :option="barChartOption" autoresize style="height: 250px" />
    </div>
  </CardComponent>
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
import CardComponent from '@/components/CardComponent.vue'
import MonthSelector from '@/components/MonthSelector.vue'

// ECharts imports
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

const generatedMonthWeek = computed(() => {
  return getMonthWeeks(internalSelectedWeek.value.year, internalSelectedWeek.value.month)
})

const getColor = (weeklyClaim?: WeeklyClaim) => {
  if (!weeklyClaim) return 'accent'
  if (weeklyClaim.status === 'pending') return 'primary'
  if (weeklyClaim.status === 'signed') return 'warning'
  if (weeklyClaim.status === 'withdrawn') return 'info'
  return 'accent'
}

const selectWeekWeelyClaim = computed(() => {
  return memberWeeklyClaims.value?.find(
    (weeklyClaim) => weeklyClaim.weekStart === internalSelectedWeek.value.isoString
  )
})

// Bar chart configuration
const barChartOption = computed(() => {
  const data: number[] = []
  const labels: string[] = []
  const weekStart = dayjs(internalSelectedWeek.value.isoString).utc().startOf('isoWeek')

  for (let i = 0; i < 7; i++) {
    const date = weekStart.add(i, 'day')
    labels.push(dayjs(date).format('dd'))
    const totalHours =
      selectWeekWeelyClaim.value?.claims
        .filter((claim) => dayjs(date).isSame(dayjs(claim.dayWorked).utc(), 'day'))
        .reduce((sum: number, claim) => sum + claim.hoursWorked, 0) ?? 0
    data.push(totalHours)
  }

  const yMax = Math.max(...data) > 0 ? Math.max(...data) : 24
  return {
    title: { text: 'Hours/Day', left: 'center', textStyle: { fontSize: 14 } },
    grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
    tooltip: { trigger: 'axis', formatter: '{b} : {c} heures' },
    xAxis: { type: 'category', data: labels, axisTick: { alignWithLabel: true } },
    yAxis: { type: 'value', min: 0, max: yMax, axisLabel: { formatter: '{value} h' } },
    series: [
      {
        name: 'Heures',
        type: 'bar',
        barWidth: '50%',
        data,
        itemStyle: { color: '#10B981', borderRadius: [6, 6, 0, 0] },
        label: { show: true, position: 'top', formatter: '{c}h', color: '#374151' }
      }
    ]
  }
})
</script>
