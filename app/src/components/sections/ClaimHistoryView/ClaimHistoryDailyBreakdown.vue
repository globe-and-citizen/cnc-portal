<template>
  <CardComponent title="" class="w-full" data-test="daily-breakdown">
    <div>
      <h2 class="pb-4">Weekly Claims: {{ selectedWeek.formatted }}</h2>
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
        <div class="flex items-center gap-2 min-w-30">
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

        <div class="text-base flex items-center gap-2 min-w-22.5 justify-end">
          <IconifyIcon icon="heroicons:clock" class="w-4 h-4 text-gray-500" />
          {{ entry.hours }} hours
        </div>
      </div>
    </div>
  </CardComponent>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import { Icon as IconifyIcon } from '@iconify/vue'
import { Icon } from '@iconify/vue'
import type { Address } from 'viem'
import type { Week } from '@/utils/dayUtils'
import { useUserDataStore } from '@/stores'
import type { WeeklyClaim, Claim } from '@/types'
import CardComponent from '@/components/CardComponent.vue'
import ClaimActions from '@/components/sections/ClaimHistoryView/ClaimActions.vue'
import ExpandableFileGallery from '@/components/sections/CashRemunerationView/Form/ExpandableFileGallery.vue'

dayjs.extend(utc)
dayjs.extend(isoWeek)

interface Props {
  weeklyClaim?: WeeklyClaim
  selectedWeek: Week
  memberAddress: Address
}

const props = defineProps<Props>()

const userStore = useUserDataStore()

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

const weekDayClaims = computed(() => {
  const weekStart = dayjs(props.selectedWeek.isoString).utc().startOf('isoWeek')
  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const date = weekStart.add(i, 'day')
    const dailyClaims =
      props.weeklyClaim?.claims?.filter((claim) => claim.dayWorked === date.toISOString()) || []
    return {
      date,
      claims: dailyClaims,
      hours: dailyClaims.reduce((sum: number, claim) => sum + claim.hoursWorked, 0)
    }
  })
})

const canModifyClaims = computed(() => {
  if (!props.weeklyClaim) return false
  return (
    props.weeklyClaim.status === 'pending' &&
    props.weeklyClaim.wage.userAddress === userStore.address
  )
})
</script>
