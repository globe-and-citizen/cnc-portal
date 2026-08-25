<template>
  <div class="mb-20 flex flex-col gap-4">
    <ClaimForm
      :initial-data="claimFormInitialData"
      mode="edit"
      :loading="isUpdating"
      :existing-files="existingFiles"
      :submission-rules="{
        restrictSubmit: isRestricted,
        maximumHoursPerDay: props.claim.wage?.maximumHoursPerDay,
        existingClaims: otherWeekClaims
      }"
      :error="{ message: updateClaimErrorMessage, title: 'Failed to update claim' }"
      @submit="updateClaim"
      @cancel="$emit('close')"
      @delete-file="deleteFile"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, watchEffect } from 'vue'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { useSubmitRestriction } from '@/composables'
import { useTeamStore } from '@/stores'
import type { Claim, ClaimFormData, ClaimSubmitPayload } from '@/types'
import { useEditClaimWithFilesMutation } from '@/queries/weeklyClaim.queries'
import { getAxiosErrorMessage } from '@/utils/httpErrorUtil'

const props = withDefaults(
  defineProps<{
    claim: Claim
    weekClaims?: Claim[]
  }>(),
  {
    weekClaims: () => []
  }
)

const emit = defineEmits<{
  close: []
}>()

const toast = useToast()
const teamStore = useTeamStore()
const { isRestricted, checkRestriction } = useSubmitRestriction()

const teamId = computed(() => teamStore.currentTeamMeta?.data?.id)

const claimFormInitialData = computed<ClaimFormData>(() => ({
  hoursWorked: String(Math.floor((props.claim.minutesWorked ?? 0) / 60)),
  minutesWorked: String((props.claim.minutesWorked ?? 0) % 60),
  memo: props.claim.memo ?? '',
  dayWorked: props.claim.dayWorked
}))

const otherWeekClaims = computed(() =>
  props.weekClaims.filter((weekClaim) => weekClaim.id !== props.claim.id)
)

const existingFiles = ref<
  Array<{
    fileType: string
    fileSize: number
    fileKey: string
    fileUrl: string
  }>
>([])
const deletedFileIndexes = ref<number[]>([])

// Load existing files
onMounted(() => {
  deletedFileIndexes.value = []
  if (props.claim.fileAttachments) {
    existingFiles.value = Array.isArray(props.claim.fileAttachments)
      ? [...props.claim.fileAttachments]
      : []
  }
})

// Sync files when claim changes
watchEffect(() => {
  if (props.claim.fileAttachments) {
    deletedFileIndexes.value = []
    existingFiles.value = Array.isArray(props.claim.fileAttachments)
      ? [...props.claim.fileAttachments]
      : []
  }
})

// Delete file function - only updates local state, actual deletion happens on Update
const deleteFile = (fileIndex: number) => {
  let originalIndex = fileIndex
  for (const deletedIdx of [...deletedFileIndexes.value].sort((a, b) => a - b)) {
    if (deletedIdx <= originalIndex) {
      originalIndex++
    }
  }
  deletedFileIndexes.value.push(originalIndex)
  existingFiles.value = existingFiles.value.filter((_, i) => i !== fileIndex)
}

// Check restriction when team changes
watch(
  teamId,
  async (newTeamId) => {
    if (newTeamId) {
      await checkRestriction(newTeamId)
    }
  },
  { immediate: true }
)

const {
  mutateAsync: updateClaimMutation,
  isPending: isUpdating,
  error: updateClaimError
} = useEditClaimWithFilesMutation()

const updateClaimErrorMessage = computed(() =>
  updateClaimError.value
    ? getAxiosErrorMessage(updateClaimError.value, 'Failed to update claim')
    : ''
)

const updateClaim = async (data: ClaimSubmitPayload & { files?: File[] }) => {
  if (!teamId.value) {
    toast.add({ title: 'Team not selected', color: 'error' })
    return
  }

  await updateClaimMutation({
    ...data,
    claimId: props.claim.id,
    deletedFileIndexes: deletedFileIndexes.value
  })

  toast.add({ title: 'Claim updated successfully', color: 'success' })
  deletedFileIndexes.value = []

  emit('close')
}

// Check restriction on mount
onMounted(async () => {
  if (teamId.value) {
    await checkRestriction(teamId.value)
  }
})
</script>
