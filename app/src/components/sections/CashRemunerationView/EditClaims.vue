<template>
  <div class="mb-20 flex flex-col gap-4">
    <ClaimForm
      ref="claimFormRef"
      :initial-data="claimFormInitialData"
      :is-edit="true"
      :is-loading="isUpdating"
      :restrict-submit="isRestricted"
      :existing-files="existingFiles"
      @submit="updateClaim"
      @cancel="$emit('close')"
      @delete-file="deleteFile"
    />

    <UAlert
      v-if="updateClaimError"
      color="error"
      variant="soft"
      icon="i-heroicons-x-circle"
      title="Failed to update claim"
      :description="updateClaimError.message"
      class="mt-4"
      data-test="edit-claim-error"
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

const props = defineProps<{
  claim: Claim
}>()

const emit = defineEmits<{
  close: []
}>()

const claimFormRef = ref<InstanceType<typeof ClaimForm> | null>(null)
const toast = useToast()
const teamStore = useTeamStore()
const { isRestricted, checkRestriction } = useSubmitRestriction()

const teamId = computed(() => teamStore.currentTeamMeta?.data?.id)

const claimFormInitialData = computed<ClaimFormData>(() => ({
  hoursWorked: String(props.claim.hoursWorked ?? ''),
  memo: props.claim.memo ?? '',
  dayWorked: props.claim.dayWorked
}))

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

  claimFormRef.value?.resetForm()
  emit('close')
}

// Check restriction on mount
onMounted(async () => {
  if (teamId.value) {
    await checkRestriction(teamId.value)
  }
})
</script>
