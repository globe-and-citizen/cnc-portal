<template>
  <!-- <pre>
    {{ { selectedMonthObject} }}
  </pre> -->
  <div class="flex bg-transparent gap-x-4" v-if="true">
    <!-- Left Sidebar -->
    <CardComponent class="w-1/3 flex flex-col justify-between">
      <div class="space-y-8">
        <!-- Month Selector -->
        <MonthSelector v-model="selectedMonthObject" />

        <!-- Week List -->
        <div class="space-y-4 z-0">
          <div
            v-for="week in generatedMonthWeek"
            :key="week.isoWeek"
            @click="selectedMonthObject = week"
            :class="[
              'border rounded-lg p-3 cursor-pointer',
              week.isoWeek === selectedMonthObject.isoWeek
                ? 'bg-emerald-50 border-emerald-500 text-gray-800'
                : 'hover:bg-gray-50'
            ]"
          >
            <div class="text-base font-medium">Week</div>
            <div
              class="text-sm"
              :class="week === selectedMonthObject ? 'text-emerald-900' : 'text-gray-800'"
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

    <!-- Right Content -->
    <div class="flex-1 space-y-6">
      <WeeklyRecap :weeklyClaim="selectWeekWeelyClaim" />

      <CardComponent title="" class="w-full">
        <div v-if="memberWeeklyClaims">
          <h2 class="pb-4">Weekly Claims: {{ selectedMonthObject.formatted }}</h2>
          <div
            v-for="(entry, index) in weekDayClaims"
            :key="index"
            :class="[
              'flex items-center justify-between border px-4 py-3 mb-2 rounded-lg ',
              entry.hours > 0
                ? 'bg-green-50 text-emerald-700 border border-emerald-500'
                : 'bg-gray-100 text-gray-400'
            ]"
          >
            <div class="flex items-center gap-2 w-1/5">
              <span
                class="h-3 w-3 rounded-full"
                :class="entry.hours > 0 ? 'bg-emerald-700' : 'bg-gray-300'"
              />
              <span class="font-medium">{{entry.date.format('ddd DD MMM')}}</span>
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
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekday from 'dayjs/plugin/weekday'
import { Icon as IconifyIcon } from '@iconify/vue'
import { getMonthWeeks, type Week } from '@/utils/dayUtils'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useTeamStore } from '@/stores'
import CardComponent from '@/components/CardComponent.vue'
import MonthSelector from '@/components/MonthSelector.vue'
import WeeklyRecap from '@/components/WeeklyRecap.vue'
import { useRoute } from 'vue-router'

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
dayjs.extend(weekday)

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

const selectedMonthObject = ref<Week>({
  year: dayjs().utc().year(),
  month: dayjs().utc().month(),
  isoWeek: dayjs().utc().isoWeek(),
  isoString: dayjs().utc().startOf('isoWeek').toISOString(),
  formatted:
    dayjs().utc().startOf('isoWeek').format('MMM DD') +
    ' - ' +
    dayjs().utc().endOf('isoWeek').format('MMM DD')
})

const generatedMonthWeek = computed(() => {
  return getMonthWeeks(selectedMonthObject.value.year, selectedMonthObject.value.month)
})

const selectWeekWeelyClaim = computed(() => {
  return memberWeeklyClaims.value?.find((weeklyClaim) => {
    console.log("Comparaison",  weeklyClaim.weekStart === selectedMonthObject.value.isoString, " ",{weekStart: weeklyClaim.weekStart, selectedMonthObject: selectedMonthObject.value.isoString})
    return weeklyClaim.weekStart === selectedMonthObject.value.isoString
  })
})

const weekDayClaims = computed(() => {
  const weekStart= dayjs(selectedMonthObject.value.isoString).utc()
  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const date = weekStart
      .add(i, 'day')
    const dailyClaims = selectWeekWeelyClaim.value?.claims.filter((claim) => claim.dayWorked === date.toISOString()) || []
    return {
      date,
      claims: dailyClaims,
      hours: dailyClaims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
    }
  })
})

function toUTCDateOnly(date: string | Date) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function sameUTCDay(a: string | Date, b: string | Date) {
  return toUTCDateOnly(a).getTime() === toUTCDateOnly(b).getTime()
}

// Bar chart dynamique (max = jour le plus haut)
const barChartOption = computed(() => {
  const days = [0, 1, 2, 3, 4, 5, 6]
  const data: number[] = []
  const labels: string[] = []

  days.forEach((i) => {
    const date = dayjs().add(i, 'day').toDate()
    const label = dayjs(date).format('dd')
    labels.push(label)

    const totalHours =
      selectWeekWeelyClaim.value?.claims
        .filter((claim) => sameUTCDay(date, claim.dayWorked))
        .reduce((sum, claim) => sum + claim.hoursWorked, 0) ?? 0

    data.push(totalHours)
  })

  const dynamicMax = Math.max(...data)
  const yMax = dynamicMax > 0 ? dynamicMax : 24

  return {
    title: {
      text: 'Hours/Day',
      left: 'center',
      textStyle: { fontSize: 14 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '8%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b} : {c} heures'
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      axisLabel: { formatter: '{value} h' }
    },
    series: [
      {
        name: 'Heures',
        type: 'bar',
        barWidth: '50%',
        data,
        itemStyle: {
          color: '#10B981',
          borderRadius: [6, 6, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}h',
          color: '#374151'
        }
      }
    ]
  }
})

</script>
