<template>
  <div class="w-full pb-6" v-if="displayedMember">
    <CardComponent>
      <div class="flex justify-between">
        <div class="flex gap-4 items-start">
          <div
            v-if="displayedMember?.imageUrl"
            class="w-28 h-28 border border-gray-60 rounded-lg overflow-hidden"
            data-test="claim-user-image-wrapper"
          >
            <img
              :src="displayedMember?.imageUrl"
              alt="User image"
              class="w-full h-full object-cover"
              data-test="claim-user-image"
            />
          </div>
          <div class="flex flex-col gap-8">
            <div class="card-title mt-4" data-test="claim-user-name">
              {{ displayedMember?.name }}
            </div>

            <div class="flex items-center gap-2">
              <img src="/Vector.png" alt="" class="w-4 h-4" />
              <AddressToolTip :address="displayedMember?.address" data-test="claim-user-address" />
            </div>
            <!-- <div class="text-sm text-gray-500">{{ description }}</div> -->
          </div>
        </div>
        <div class="w-60">
          <SelectMemberItem v-if="memberAddress" :address="memberAddress" />
        </div>
      </div>
    </CardComponent>
  </div>
  <div class="flex bg-transparent gap-x-4">
    <!-- Left Sidebar -->
    <CardComponent class="min-w[270px] flex flex-col justify-between">
      <div class="space-y-8">
        <!-- Month Selector -->
        <MonthSelector v-model="selectedMonthObject" />

        <!-- Week List -->
        <div class="space-y-4 z-0">
          <div
            v-for="week in generatedMonthWeek"
            :key="week.isoWeek"
            @click="
              () => {
                selectedMonthObject = week
              }
            "
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
              <SubmitClaims
                v-if="hasWage"
                :weekly-claim="selectWeekWeelyClaim"
                :signed-week-starts="signedWeekStarts"
              />
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
            <div class="flex items-center gap-2 min-w-[120px]">
              <span
                class="h-3 w-3 rounded-full"
                :class="entry.hours > 0 ? 'bg-emerald-700' : 'bg-gray-300'"
              />
              <span class="font-medium">{{ entry.date.format('ddd DD MMM') }}</span>
            </div>

            <div v-if="entry.hours > 0" class="text-sm text-gray-500 w-3/5 pl-10 space-y-3">
              <div v-for="claim in entry.claims" :key="claim.id" class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <span>{{ claim.memo }}</span>
                  <ClaimActions v-if="canModifyClaims" :claim="claim" />
                </div>

                <!-- Files Gallery (Images + Documents) -->
                <div
                  v-if="claim.imageScreens && claim.imageScreens.length > 0"
                  class="grid grid-cols-4 gap-2 mt-2"
                  data-test="claim-files-gallery"
                >
                  <template v-for="(fileUrl, fileIndex) in claim.imageScreens" :key="fileIndex">
                    <!-- Image thumbnail -->
                    <div
                      v-if="isImageUrl(fileUrl)"
                      class="relative cursor-pointer group"
                      @click="openLightbox(fileUrl)"
                      data-test="claim-image-item"
                    >
                      <img
                        :src="fileUrl"
                        :alt="`Screenshot ${fileIndex + 1}`"
                        class="w-full h-20 object-cover rounded border border-gray-300 hover:border-emerald-500 transition-all"
                        loading="lazy"
                        data-test="claim-image-thumbnail"
                      />
                      <div
                        class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded flex items-center justify-center"
                      >
                        <IconifyIcon
                          icon="heroicons:magnifying-glass-plus"
                          class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>

                    <!-- Document file (PDF, ZIP, DOCX, TXT) -->
                    <a
                      v-else
                      :href="fileUrl"
                      target="_blank"
                      download
                      class="relative cursor-pointer group flex flex-col items-center justify-center w-full h-20 rounded border border-gray-300 hover:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-all"
                      data-test="claim-document-item"
                      @click.stop
                    >
                      <IconifyIcon
                        :icon="getFileIconFromUrl(fileUrl)"
                        class="w-8 h-8 text-gray-600 group-hover:text-emerald-600 transition-colors"
                      />
                      <span class="text-xs text-gray-500 mt-1 truncate w-full text-center px-1">
                        {{ getFileNameFromUrl(fileUrl) }}
                      </span>
                      <div
                        class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <IconifyIcon
                          icon="heroicons:arrow-down-tray"
                          class="w-4 h-4 text-emerald-600"
                        />
                      </div>
                    </a>
                  </template>
                </div>
              </div>
            </div>

            <div class="text-base flex items-center gap-2 min-w-[90px] justify-end">
              <IconifyIcon icon="heroicons:clock" class="w-4 h-4 text-gray-500" />
              {{ entry.hours }} hours
            </div>
          </div>
        </div>
      </CardComponent>
    </div>
  </div>

  <!-- Lightbox Modal -->
  <Teleport to="body">
    <div
      v-if="lightboxImage"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
      @click="closeLightbox"
      data-test="lightbox-modal"
    >
      <button
        class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
        @click="closeLightbox"
        data-test="lightbox-close-button"
      >
        <IconifyIcon icon="heroicons:x-mark" class="w-8 h-8" />
      </button>
      <img
        :src="lightboxImage"
        alt="Full size screenshot"
        class="max-w-full max-h-full object-contain"
        @click.stop
        data-test="lightbox-image"
      />
    </div>
  </Teleport>
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
import type { Address } from 'viem'

import SubmitClaims from '../CashRemunerationView/SubmitClaims.vue'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ClaimActions from '@/components/sections/ClaimHistoryView/ClaimActions.vue'
import SelectMemberItem from '@/components/SelectMemberItem.vue'

use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, BarChart, CanvasRenderer])
dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(weekday)

const route = useRoute()
const teamStore = useTeamStore()
const userStore = useUserDataStore()
const toastStore = useToastStore()

const memberAddress = computed(() => route.params.memberAddress as Address | undefined)

const displayedMember = computed(() => {
  return (teamStore.currentTeam?.members || []).find(
    (member) => member.address.toLowerCase() === memberAddress.value?.toLowerCase()
  )
})

const currentWeekStart = dayjs().utc().startOf('isoWeek').toISOString()

const getColor = (weeklyClaim?: WeeklyClaim) => {
  if (!weeklyClaim) return 'accent'
  if (weeklyClaim.status === 'pending') return 'primary'
  if (weeklyClaim.status === 'signed') return 'warning'
  if (weeklyClaim.status === 'withdrawn') return 'info'
  return 'accent'
}

const teamId = computed(() => teamStore.currentTeam?.id)

const weeklyClaimQueryKey = computed(() => ['weekly-claims', teamId.value, memberAddress.value])
const weeklyClaimURL = computed(
  () => `/weeklyClaim/?teamId=${teamId.value}&memberAddress=${memberAddress.value}`
)

const { data: memberWeeklyClaims, refetch } = useTanstackQuery<Array<WeeklyClaim>>(
  weeklyClaimQueryKey,
  weeklyClaimURL
)

watch(
  memberAddress,
  () => {
    refetch()
  },
  { immediate: true }
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

// Lightbox state
const lightboxImage = ref<string | null>(null)

const openLightbox = (imageUrl: string) => {
  lightboxImage.value = imageUrl
}

const closeLightbox = () => {
  lightboxImage.value = null
}

// File type detection utilities
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']

const isImageUrl = (url: string): boolean => {
  const urlLower = url.toLowerCase()
  return IMAGE_EXTENSIONS.some((ext) => urlLower.includes(ext))
}

const getFileIconFromUrl = (url: string): string => {
  const urlLower = url.toLowerCase()
  if (urlLower.includes('.pdf')) return 'heroicons:document-text'
  if (urlLower.includes('.zip')) return 'heroicons:archive-box'
  if (urlLower.includes('.docx') || urlLower.includes('.doc')) return 'heroicons:document'
  if (urlLower.includes('.txt')) return 'heroicons:document-text'
  return 'heroicons:paper-clip'
}

const getFileNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = pathname.split('/').pop() || 'file'
    // Truncate if too long
    if (fileName.length > 12) {
      const ext = fileName.split('.').pop() || ''
      const baseName = fileName.slice(0, fileName.length - ext.length - 1)
      return `${baseName.slice(0, 8)}...${ext}`
    }
    return fileName
  } catch {
    return 'file'
  }
}

const selectWeekWeelyClaim = computed(() => {
  return memberWeeklyClaims.value?.find(
    (weeklyClaim) => weeklyClaim.weekStart === selectedMonthObject.value.isoString
  )
})

// Current signed weeks for disabling dates in claim form
const signedWeekStarts = computed(() => {
  return (
    memberWeeklyClaims.value
      ?.filter((weeklyClaim) => weeklyClaim.status === 'signed' || weeklyClaim.signature)
      .map((weeklyClaim) => weeklyClaim.weekStart) ?? []
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

const canModifyClaims = computed(() => {
  if (!selectWeekWeelyClaim.value) return false
  return (
    selectWeekWeelyClaim.value.status === 'pending' &&
    selectWeekWeelyClaim.value.wage.userAddress === userStore.address
  )
})
</script>
