<template>
  <div class="w-full pb-6">
    <CardComponent>
      <div class="flex gap-4 items-start">
        <div v-if="imageUrl" class="w-28 h-28 border border-gray-60 rounded-lg overflow-hidden">
          <img :src="imageUrl" alt="Card image" class="w-full h-full object-cover" />
        </div>
        <div class="flex flex-col gap-8">
          <div class="card-title mt-4">{{ name }}</div>

          <div class="flex items-center gap-2">
            <img src="/public/Vector.png" alt="" class="w-4 h-4" />
            <AddressToolTip :address="address" />
          </div>
          <!-- <div class="text-sm text-gray-500">{{ description }}</div> -->
        </div>
      </div>
    </CardComponent>
  </div>
  <div class="flex bg-transparent gap-x-4">
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
      <CardComponent>
        <div class="flex flex-col gap-4">
          <div
            role="alert"
            class="alert alert-vertical sm:alert-horizontal"
            v-if="memberAddress === userStore.address"
          >
            <IconifyIcon icon="heroicons:information-circle" class="w-8 h-8 text-info" />
            <span>{{
              hasWage
                ? 'You have a wage so you can submit your claim'
                : 'You need to have a wage set up to submit claims'
            }}</span>
            <div>
              <SubmitClaims v-if="hasWage" />
              <ButtonUI
                v-else
                variant="success"
                size="sm"
                :disabled="true"
                data-test="submit-claim-disabled-button"
              >
                Submit Claim
              </ButtonUI>
            </div>
          </div>
          <div
            role="alert"
            class="alert alert-vertical sm:alert-horizontal"
            v-if="selectWeekWeelyClaim && !selectWeekWeelyClaim.signature"
          >
            <IconifyIcon icon="heroicons:information-circle" class="w-8 h-8 text-info" />
            <span>{{
              selectWeekWeelyClaim?.weekStart === currentWeekStart
                ? 'You cannot approve the current week claim, wait until the week is over'
                : 'As the owner of the Cash Remuneration contract, you can approve this claim'
            }}</span>
            <div>
              <CRSigne
                v-if="selectWeekWeelyClaim.claims.length > 0"
                :disabled="selectWeekWeelyClaim.weekStart === currentWeekStart"
                :weekly-claim="selectWeekWeelyClaim"
              />
            </div>
          </div>

          <!-- <pre>{{ selectWeekWeelyClaim }}</pre> -->
          <div
            role="alert"
            class="alert alert-vertical sm:alert-horizontal"
            v-if="
              selectWeekWeelyClaim &&
              (selectWeekWeelyClaim.status == 'signed' ||
                selectWeekWeelyClaim.status == 'withdrawn') &&
              userStore.address === selectWeekWeelyClaim.wage.userAddress
            "
          >
            <IconifyIcon icon="heroicons:information-circle" class="w-8 h-8 text-info" />
            <span v-if="selectWeekWeelyClaim.status == 'withdrawn'"
              >You have withdrawn your weekly claim.</span
            >
            <span v-else>Your weekly claim has been approved. You can now withdraw it.</span>
            <div>
              <CRWithdrawClaim
                v-if="selectWeekWeelyClaim.claims.length > 0"
                :disabled="selectWeekWeelyClaim.status == 'withdrawn'"
                :weekly-claim="selectWeekWeelyClaim"
              />
            </div>
          </div>
        </div>
      </CardComponent>
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
              <span class="font-medium">{{ entry.date.format('ddd DD MMM') }}</span>
            </div>

            <div v-if="entry.hours > 0" class="text-sm text-gray-500 w-3/5 pl-10 space-y-1">
              <div
                v-for="claim in entry.claims"
                :key="claim.id"
                class="flex items-center justify-between"
              >
                <span>{{ claim.memo }}</span>
                <ButtonUI
                  v-if="claim.status === 'pending'"
                  variant="ghost"
                  size="xs"
                  @click="editClaim(claim)"
                  data-test="edit-claim-button"
                >
                  <IconifyIcon icon="heroicons:pencil-square" class="w-4 h-4" />
                </ButtonUI>
              </div>
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

  <!-- Add edit modal -->
  <EditClaimModal
    v-if="claimToEdit"
    :claim="claimToEdit"
    :team-id="teamId || 0"
    @week-change="handleWeekChange"
    @close="claimToEdit = null"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekday from 'dayjs/plugin/weekday'
import { Icon as IconifyIcon } from '@iconify/vue'
import { formatIsoWeekRange, getMonthWeeks, type Week } from '@/utils/dayUtils'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
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
import { useTanstackQuery } from '@/composables'
import type { Wage, WeeklyClaim } from '@/types'
import SubmitClaims from '../CashRemunerationView/SubmitClaims.vue'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'
import { storeToRefs } from 'pinia'
import AddressToolTip from '@/components/AddressToolTip.vue'
import EditClaimModal from '../CashRemunerationView/EditClaimModal.vue'
import type { Claim } from '@/types'
use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, BarChart, CanvasRenderer])
dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(weekday)

const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()

const emit = defineEmits<{
  weekChange: [weekStart: string]
}>()

const getColor = (weeklyClaim?: WeeklyClaim) => {
  if (!weeklyClaim) return 'accent'
  if (weeklyClaim.status === 'pending') return 'primary'
  if (weeklyClaim.status === 'signed') return 'warning'
  if (weeklyClaim.status === 'withdrawn') return 'info'
  return 'accent'
}

const route = useRoute()
const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toastStore = useToastStore()
const { imageUrl, name, address } = storeToRefs(userStore)
const teamId = computed(() => teamStore.currentTeam?.id)
const memberAddress = computed(() => route.params.memberAddress as string | undefined)

const weeklyClaimQueryKey = computed(() => [
  'weekly-claims',
  teamId.value,
  memberAddress.value || userStore.address
])
const weeklyClaimURL = computed(
  () =>
    `/weeklyClaim/?teamId=${teamId.value}&memberAddress=${memberAddress.value || userStore.address}`
)
const { data: memberWeeklyClaims } = useTanstackQuery<Array<WeeklyClaim>>(
  weeklyClaimQueryKey,
  weeklyClaimURL
)

const teamWageQueryKey = computed(() => ['team-wage', teamStore.currentTeam?.id])
const { data: teamWageData, error: teamWageDataError } = useTanstackQuery<Array<Wage>>(
  teamWageQueryKey,
  computed(() => `/wage/?teamId=${teamStore.currentTeam?.id}`)
)

const hasWage = computed(() => {
  const userWage = teamWageData.value?.find((wage) => wage.userAddress === userStore.address)
  if (!userWage) return false

  return true
})

watch(teamWageDataError, (newVal) => {
  if (newVal) {
    toastStore.addErrorToast('Failed to fetch user wage data')
  }
})

const selectedMonthObject = ref<Week>({
  year: dayjs().utc().year(),
  month: dayjs().utc().month(),
  isoWeek: dayjs().utc().isoWeek(),
  isoString: dayjs().utc().startOf('isoWeek').toISOString(),
  formatted: formatIsoWeekRange(dayjs().utc().startOf('isoWeek'))
})

const generatedMonthWeek = computed(() => {
  return getMonthWeeks(selectedMonthObject.value.year, selectedMonthObject.value.month)
})

const selectWeekWeelyClaim = computed(() => {
  return memberWeeklyClaims.value?.find(
    (weeklyClaim) => weeklyClaim.weekStart === selectedMonthObject.value.isoString
  )
})

const weekDayClaims = computed(() => {
  const weekStart = dayjs(selectedMonthObject.value.isoString).utc().startOf('isoWeek')
  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const date = weekStart.add(i, 'day')
    const dailyClaims =
      selectWeekWeelyClaim.value?.claims.filter(
        (claim) => claim.dayWorked === date.toISOString()
      ) || []
    return {
      date,
      claims: dailyClaims,
      hours: dailyClaims.reduce((sum, claim) => sum + claim.hoursWorked, 0)
    }
  })
})

// Bar chart dynamique (max = jour le plus haut)
const barChartOption = computed(() => {
  const days = [0, 1, 2, 3, 4, 5, 6]
  const data: number[] = []
  const labels: string[] = []

  const weekStart = dayjs(selectedMonthObject.value.isoString).utc().startOf('isoWeek')
  days.forEach((i) => {
    const date = weekStart.add(i, 'day')
    const label = dayjs(date).format('dd')
    labels.push(label)

    const totalHours =
      selectWeekWeelyClaim.value?.claims
        .filter((claim) => {
          return dayjs(date).isSame(dayjs(claim.dayWorked).utc(), 'day')
        })
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

// Add state for editing
const claimToEdit = ref<Claim | null>(null)

// Add edit handler
const editClaim = (claim: Claim) => {
  claimToEdit.value = claim
}

// Handle week change from edit modal
const handleWeekChange = (newWeekStart: string) => {
  // Update selected week
  selectedMonthObject.value = {
    year: dayjs(newWeekStart).utc().year(),
    month: dayjs(newWeekStart).utc().month(),
    isoWeek: dayjs(newWeekStart).utc().isoWeek(),
    isoString: newWeekStart,
    formatted: formatIsoWeekRange(dayjs(newWeekStart).utc())
  }
}
</script>
