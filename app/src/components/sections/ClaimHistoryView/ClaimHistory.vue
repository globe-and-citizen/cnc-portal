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
              hasWage && selectWeekWeelyClaim?.status === 'pending'
                ? 'You have a wage so you can submit your claim'
                : hasWage && selectWeekWeelyClaim && selectWeekWeelyClaim.status !== 'pending'
                  ? `This week claim is already ${selectWeekWeelyClaim.status}, you cannot submit new claims`
                  : 'You need to have a wage set up to submit claims'
            }}</span>
            <div>
              <SubmitClaims
                v-if="hasWage && selectWeekWeelyClaim?.status === 'pending'"
                :weekly-claim="selectWeekWeelyClaim"
                :signed-week-starts="signedWeekStarts"
                :restrict-submit="false"
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
                : selectWeekWeelyClaim?.weekStart === nextWeekStart
                  ? 'You cannot approve the next week claim, wait until the week is over'
                  : 'As the owner of the Cash Remuneration contract, you can approve this claim'
            }}</span>
            <div>
              <CRSigne
                v-if="selectWeekWeelyClaim.claims.length > 0"
                :disabled="
                  selectWeekWeelyClaim.weekStart === currentWeekStart ||
                  selectWeekWeelyClaim.weekStart === nextWeekStart
                "
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

              <!-- Attachment icon if files exist -->
              <span
                v-if="entry.hours > 0 && hasAttachments(entry.claims)"
                class="inline-flex items-center"
                data-test="attachment-icon"
                title="Has attachments"
              >
                <Icon icon="heroicons:paper-clip" class="w-4 h-4 text-blue-600" />
              </span>
            </div>

            <div v-if="entry.hours > 0" class="text-sm text-gray-500 w-3/5 pl-10 space-y-3">
              <div v-for="claim in entry.claims" :key="claim.id" class="space-y-2">
                <!-- Memo above -->
                <div class="flex items-center justify-between gap-3">
                  <div class="flex-1">
                    <p class="font-medium text-gray-700">{{ claim.memo }}</p>
                  </div>
                  <ClaimActions v-if="canModifyClaims" :claim="claim" />
                </div>
                <!-- File gallery below memo -->
                <ExpandableFileGallery
                  v-if="claim.fileAttachments && claim.fileAttachments.length > 0"
                  :previews="buildFilePreviews(claim.fileAttachments)"
                  :max-visible="4"
                  item-size-class="w-10 h-10"
                  expanded-item-size-class="w-16 h-16"
                  data-test="claim-files-expandable"
                />
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Icon as IconifyIcon } from '@iconify/vue'
import { Icon } from '@iconify/vue'
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
import { useGetTeamWeeklyClaimsQuery, useGetTeamWagesQuery } from '@/queries'
import type { Claim, WeeklyClaim } from '@/types'
import type { Address } from 'viem'

import SubmitClaims from '../CashRemunerationView/SubmitClaims.vue'
import CRSigne from '../CashRemunerationView/CRSigne.vue'
import ButtonUI from '@/components/ButtonUI.vue'
import CRWithdrawClaim from '../CashRemunerationView/CRWithdrawClaim.vue'
import AddressToolTip from '@/components/AddressToolTip.vue'
import ClaimActions from '@/components/sections/ClaimHistoryView/ClaimActions.vue'
import SelectMemberItem from '@/components/SelectMemberItem.vue'
import ExpandableFileGallery from '@/components/sections/CashRemunerationView/Form/ExpandableFileGallery.vue'

use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, BarChart, CanvasRenderer])
dayjs.extend(utc)
dayjs.extend(isoWeek)

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
const nextWeekStart = dayjs().utc().add(1, 'week').startOf('isoWeek').toISOString()

const getColor = (weeklyClaim?: WeeklyClaim) => {
  if (!weeklyClaim) return 'accent'
  if (weeklyClaim.status === 'pending') return 'primary'
  if (weeklyClaim.status === 'signed') return 'warning'
  if (weeklyClaim.status === 'withdrawn') return 'info'
  return 'accent'
}

const { data: memberWeeklyClaims } = useGetTeamWeeklyClaimsQuery({
  queryParams: {
    teamId: computed(() => teamStore.currentTeamId),
    userAddress: memberAddress
  }
})

const { data: teamWageData, error: teamWageDataError } = useGetTeamWagesQuery({
  queryParams: { teamId: computed(() => teamStore.currentTeamId) }
})

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

interface FileAttachment {
  fileType: string
  fileSize: number
  fileKey: string
  fileUrl: string
}

const buildFilePreviews = (files: FileAttachment[]) => {
  const imageMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']

  return files.map((file) => {
    // Use MIME type to determine if it's an image
    const isImage = imageMimeTypes.includes(file?.fileType)
    // Derive display name from fileKey (basename)
    const displayName = file.fileKey?.split('/').pop() || 'file'

    return {
      previewUrl: file.fileUrl,
      fileName: displayName, // Display name derived from key
      fileSize: file.fileSize,
      fileType: file.fileType,
      isImage,
      key: file.fileKey
    }
  })
}

const hasAttachments = (claims: Claim[]): boolean => {
  return claims.some((claim) => claim.fileAttachments && claim.fileAttachments.length > 0)
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
      selectWeekWeelyClaim.value?.claims?.filter(
        (claim) => claim.dayWorked === date.toISOString()
      ) || []
    return {
      date,
      claims: dailyClaims,
      hours: dailyClaims.reduce((sum: number, claim) => sum + claim.hoursWorked, 0)
    }
  })
})

// Bar chart configuration
const barChartOption = computed(() => {
  const data: number[] = []
  const labels: string[] = []
  const weekStart = dayjs(selectedMonthObject.value.isoString).utc().startOf('isoWeek')

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

const canModifyClaims = computed(() => {
  if (!selectWeekWeelyClaim.value) return false
  return (
    selectWeekWeelyClaim.value.status === 'pending' &&
    selectWeekWeelyClaim.value.wage.userAddress === userStore.address
  )
})
</script>
