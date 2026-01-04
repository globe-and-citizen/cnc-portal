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

              <!-- Attachment icon if files exist -->
              <button
                v-if="entry.hours > 0 && hasAttachments(entry.claims)"
                @click="viewAttachments(entry.date)"
                class="btn btn-xs btn-ghost btn-circle"
                data-test="attachment-icon"
                title="View attachments"
              >
                <Icon icon="heroicons:paper-clip" class="w-4 h-4 text-blue-600" />
              </button>
            </div>

            <div v-if="entry.hours > 0" class="text-sm text-gray-500 w-3/5 pl-10 space-y-3">
              <div v-for="claim in entry.claims" :key="claim.id" class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex-1">
                    <p class="font-medium text-gray-700">{{ claim.memo }}</p>
                  </div>
                  <ClaimActions v-if="canModifyClaims" :claim="claim" />
                </div>

                <!-- Files Gallery (Images + Documents) with Delete -->
                <div
                  v-if="claim.fileAttachments && claim.fileAttachments.length > 0"
                  class="grid grid-cols-6 sm:grid-cols-8 gap-2 mt-2"
                  data-test="claim-files-gallery"
                >
                  <template v-for="(file, fileIndex) in claim.fileAttachments" :key="fileIndex">
                    <!-- Image thumbnail -->
                    <div
                      v-if="isImageFile(file)"
                      class="relative cursor-pointer group"
                      data-test="claim-image-item"
                      @click="openLightboxFromFile(file)"
                    >
                      <img
                        :src="getFileDataUrl(file)"
                        :alt="file.fileName"
                        class="w-full h-16 object-cover rounded border border-gray-300 hover:border-emerald-500 transition-all"
                        loading="lazy"
                        data-test="claim-image-thumbnail"
                      />
                      <div
                        class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded flex items-center justify-center pointer-events-none"
                      >
                        <IconifyIcon
                          icon="heroicons:magnifying-glass-plus"
                          class="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <button
                        v-if="canModifyClaims"
                        @click.stop="deleteClaimFile(claim.id, fileIndex)"
                        class="absolute -top-1 -right-1 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        :data-test="`delete-claim-file-${fileIndex}`"
                      >
                        <IconifyIcon icon="heroicons:x-mark" class="w-3 h-3" />
                      </button>
                    </div>

                    <!-- Document file (PDF, ZIP, DOCX, TXT) -->
                    <div
                      v-else
                      class="relative cursor-pointer group"
                      data-test="claim-document-item"
                    >
                      <a
                        @click="openDocumentPreview(file, claim.id, fileIndex)"
                        class="flex flex-col items-center justify-center w-full h-16 rounded border border-gray-300 hover:border-emerald-500 bg-gray-50 hover:bg-gray-100 transition-all"
                      >
                        <IconifyIcon
                          :icon="getFileIcon(file)"
                          class="w-6 h-6 text-gray-600 group-hover:text-emerald-600 transition-colors"
                        />
                        <span
                          class="text-[10px] text-gray-400 mt-0.5 truncate w-full text-center px-1"
                        >
                          {{ file.fileName.split('.').pop()?.toUpperCase() }}
                        </span>
                      </a>
                      <button
                        v-if="canModifyClaims"
                        @click.stop="deleteClaimFile(claim.id, fileIndex)"
                        class="absolute -top-1 -right-1 btn btn-xs btn-circle btn-error opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        :data-test="`delete-claim-file-${fileIndex}`"
                      >
                        <IconifyIcon icon="heroicons:x-mark" class="w-3 h-3" />
                      </button>
                    </div>
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
      class="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-90 p-4"
      @click="closeLightbox"
      data-test="lightbox-modal"
    >
      <div
        class="relative bg-black rounded-lg max-w-4xl max-h-full flex flex-col items-center justify-center"
        @click.stop
      >
        <div class="absolute top-4 right-4 flex gap-2 z-20">
          <button
            class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-60 transition-all"
            @click="closeLightbox"
            data-test="lightbox-close-button"
          >
            Close
            <!-- <IconifyIcon icon="heroicons:x-mark" class="w-6 h-6" /> -->
          </button>
          <button
            class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80 transition-all"
            @click="downloadCurrentImage"
            data-test="lightbox-download-button"
            title="Download image"
          >
            Download
            <!-- <IconifyIcon icon="heroicons:arrow-down-tray" class="w-5 h-5" /> -->
          </button>
        </div>
        <img
          :src="lightboxImage"
          alt="Full size screenshot"
          class="max-w-full max-h-full object-contain"
          @click.stop
          data-test="lightbox-image"
        />
      </div>
    </div>
  </Teleport>

  <!-- Document Preview Modal -->
  <Teleport to="body">
    <div
      v-if="docPreviewUrl"
      class="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-80 p-4"
      @click="closeDocPreview"
      data-test="doc-preview-modal"
    >
      <div
        class="relative bg-white rounded-lg shadow-xl max-w-5xl w-full h-[80vh] p-4 flex flex-col"
        @click.stop
      >
        <div class="flex justify-between items-center mb-3">
          <div class="font-semibold text-gray-800 truncate" :title="docPreviewName">
            {{ docPreviewName }}
          </div>
          <div class="flex gap-2">
            <ButtonUI size="sm" variant="ghost" @click="closeDocPreview">Close</ButtonUI>
            <ButtonUI size="sm" variant="success" @click="downloadAttachmentForPreview">
              Download
            </ButtonUI>
          </div>
        </div>

        <div class="flex-1 overflow-hidden rounded border border-gray-200 bg-gray-50">
          <!-- PDF Preview -->
          <iframe
            v-if="docPreviewType?.includes('pdf') || docPreviewName.toLowerCase().endsWith('.pdf')"
            :src="docPreviewUrl"
            class="w-full h-full"
            title="Document preview"
          ></iframe>

          <!-- Text File Preview -->
          <pre
            v-else-if="
              docPreviewType?.includes('text/plain') ||
              docPreviewName.toLowerCase().endsWith('.txt')
            "
            class="w-full h-full p-4 overflow-auto whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white"
            >{{ decodeTextFile(docPreviewUrl) }}</pre
          >

          <!-- Non-previewable files (DOCX, ZIP, etc.) - Show file info -->
          <div v-else class="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
            <IconifyIcon
              :icon="getFileIcon({ fileName: docPreviewName, fileType: docPreviewType })"
              class="w-24 h-24 text-gray-400"
            />
            <div class="text-center">
              <div class="text-xl font-semibold text-gray-700 mb-2">{{ docPreviewName }}</div>
              <div class="text-sm text-gray-500 mb-4">Type: {{ docPreviewType || 'Unknown' }}</div>
              <p class="text-gray-600 mb-6">This file type cannot be previewed in the browser.</p>
              <ButtonUI variant="success" @click="downloadAttachmentForPreview">
                <IconifyIcon icon="heroicons:arrow-down-tray" class="w-5 h-5 mr-2" />
                Download to view
              </ButtonUI>
            </div>
          </div>
        </div>
      </div>
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
import { Icon } from '@iconify/vue'
import { formatIsoWeekRange, getMonthWeeks, type Week } from '@/utils/dayUtils'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { BACKEND_URL } from '@/constant'

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
import { useQueryClient } from '@tanstack/vue-query'

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
const queryClient = useQueryClient()

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

const teamId = computed(() => teamStore.currentTeamId)

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

const teamWageQueryKey = computed(() => ['team-wage', teamStore.currentTeamId])
const { data: teamWageData, error: teamWageDataError } = useTanstackQuery<Array<Wage>>(
  teamWageQueryKey,
  computed(() => `/wage/?teamId=${teamStore.currentTeamId}`)
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
const currentLightboxFile = ref<any | null>(null)
const docPreviewUrl = ref<string | null>(null)
const docPreviewName = ref<string>('')
const docPreviewType = ref<string>('')

const openLightbox = (imageUrl: string, file?: any) => {
  console.log('openLightbox called with URL length:', imageUrl?.length)
  if (!imageUrl) {
    console.error('openLightbox: No image URL provided')
    return
  }
  lightboxImage.value = imageUrl
  currentLightboxFile.value = file || null
}

const closeLightbox = () => {
  lightboxImage.value = null
  currentLightboxFile.value = null
}

const downloadCurrentImage = () => {
  if (!lightboxImage.value) return
  const link = document.createElement('a')
  link.href = lightboxImage.value
  link.download = currentLightboxFile.value?.fileName || 'image'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

// File type detection utilities
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']
const IMAGE_MIMETYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']

const isImageFile = (file: any): boolean => {
  if (!file) return false
  const byType = file.fileType && IMAGE_MIMETYPES.includes(file.fileType)
  const byExt =
    file.fileName && IMAGE_EXTENSIONS.some((ext) => file.fileName.toLowerCase().endsWith(ext))
  return byType || byExt
}

const getFileDataUrl = (file: any): string => {
  if (!file) {
    console.error('getFileDataUrl: No file provided')
    return ''
  }
  if (!file.fileData) {
    console.error('getFileDataUrl: No fileData for file:', file.fileName)
    return ''
  }
  if (!file.fileType) {
    console.error('getFileDataUrl: No fileType for file:', file.fileName)
    return ''
  }
  // file.fileData is already base64 encoded
  return `data:${file.fileType};base64,${file.fileData}`
}

const decodeTextFile = (dataUrl: string): string => {
  try {
    // Extract base64 data from data URL
    const base64Data = dataUrl.split(',')[1]
    if (!base64Data) return 'Unable to decode file content'

    // Decode base64 to text
    const decodedText = atob(base64Data)
    return decodedText || 'File is empty'
  } catch (error) {
    console.error('Error decoding text file:', error)
    return 'Error reading file content'
  }
}

const getFileIcon = (file: any): string => {
  const fileName = file.fileName.toLowerCase()
  if (fileName.includes('.pdf')) return 'heroicons:document-text'
  if (fileName.includes('.zip')) return 'heroicons:archive-box'
  if (fileName.includes('.docx') || fileName.includes('.doc')) return 'heroicons:document'
  if (fileName.includes('.txt')) return 'heroicons:document-text'
  return 'heroicons:paper-clip'
}

const openLightboxFromFile = (file: any) => {
  console.log(
    'openLightboxFromFile called with file:',
    file?.fileName,
    'hasData:',
    !!file?.fileData
  )
  const url = getFileDataUrl(file)
  console.log('Generated URL length:', url?.length)
  if (url) {
    openLightbox(url, file)
  } else {
    console.error('Failed to generate URL for file:', file?.fileName)
  }
}

const openDocumentPreview = (file: any, claimId: number, fileIndex: number) => {
  // Open preview modal for ALL file types
  docPreviewUrl.value = getFileDataUrl(file)
  docPreviewName.value = file.fileName
  docPreviewType.value = file.fileType
}

const downloadAttachmentForPreview = () => {
  if (!docPreviewUrl.value) return
  // Use the existing download method on the currently previewed file if we have enough context
  // Fallback: trigger a download of the data URL
  const link = document.createElement('a')
  link.href = docPreviewUrl.value
  link.download = docPreviewName.value || 'attachment'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const closeDocPreview = () => {
  docPreviewUrl.value = null
  docPreviewName.value = ''
  docPreviewType.value = ''
}

// Delete file from claim
const deleteClaimFile = async (claimId: number, fileIndex: number) => {
  try {
    const authToken = localStorage.getItem('authToken')
    const response = await fetch(`${BACKEND_URL}/api/claim/${claimId}/file/${fileIndex}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete file')
    }

    toastStore.addSuccessToast('File deleted successfully')

    // Refresh claims data
    await queryClient.invalidateQueries({
      queryKey: ['weekly-claims', teamStore.currentTeamId]
    })
  } catch (error) {
    console.error('Failed to delete file:', error)
    toastStore.addErrorToast('Failed to delete file')
  }
}

const hasAttachments = (claims: any[]): boolean => {
  return claims.some((claim) => claim.fileAttachments && claim.fileAttachments.length > 0)
}

const viewAttachments = (date: dayjs.Dayjs) => {
  // Simply log for now - in future could open a modal with attachments for the day
  console.log('View attachments for date:', date.format('YYYY-MM-DD'))
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
