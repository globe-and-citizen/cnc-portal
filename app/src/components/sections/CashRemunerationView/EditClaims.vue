<template>
  <div class="flex flex-col gap-4 mb-20">
    <h3 class="text-xl font-bold">Edit Claim</h3>
    <hr />

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

    <div v-if="errorMessage" class="mt-4">
      <div role="alert" class="alert alert-error" data-test="edit-claim-error">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 shrink-0 stroke-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{{ errorMessage.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, watchEffect } from 'vue'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { useSubmitRestriction } from '@/composables'
import { useToastStore, useTeamStore } from '@/stores'
import type { Claim, ClaimFormData, ClaimSubmitPayload } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'

const props = defineProps<{
  claim: Claim
}>()

const emit = defineEmits<{
  close: []
}>()

const errorMessage = ref<{ message: string } | null>(null)
const claimFormRef = ref<InstanceType<typeof ClaimForm> | null>(null)
const toastStore = useToastStore()
const teamStore = useTeamStore()
const queryClient = useQueryClient()
const { isRestricted, checkRestriction } = useSubmitRestriction()

const teamId = computed(() => teamStore.currentTeam?.id)

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

const { mutateAsync: updateClaimMutation, isPending: isUpdating } = useMutation<
  void,
  Error,
  ClaimSubmitPayload & { files?: File[] }
>({
  mutationKey: ['update-claim', props.claim.id],
  mutationFn: async (payload) => {
    // Pre-upload new files if any
    const newAttachments: Array<{
      fileKey: string
      fileUrl: string
      fileType: string
      fileSize: number
    }> = []

    if (payload.files && payload.files.length > 0) {
      // Upload each file to /api/upload
      for (const file of payload.files) {
        const formData = new FormData()
        formData.append('file', file)

        const uploadResponse = await apiClient.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })

        newAttachments.push({
          fileKey: uploadResponse.data.fileKey,
          fileUrl: uploadResponse.data.fileUrl,
          fileType: uploadResponse.data.metadata.fileType,
          fileSize: uploadResponse.data.metadata.fileSize
        })
      }
    }

    // Submit claim update with pre-uploaded attachments metadata
    await apiClient.put(`/claim/${props.claim.id}`, {
      hoursWorked: payload.hoursWorked.toString(),
      memo: payload.memo,
      dayWorked: payload.dayWorked,
      deletedFileIndexes:
        deletedFileIndexes.value.length > 0 ? deletedFileIndexes.value : undefined,
      attachments: newAttachments.length > 0 ? newAttachments : undefined
    })
  }
})

const updateClaim = async (data: ClaimSubmitPayload & { files?: File[] }) => {
  errorMessage.value = null
  if (!teamId.value) {
    toastStore.addErrorToast('Team not selected')
    return
  }

  try {
    await updateClaimMutation(data)

    toastStore.addSuccessToast('Claim updated successfully')
    deletedFileIndexes.value = []

    await queryClient.invalidateQueries({
      queryKey: ['teamWeeklyClaims']
    })

    claimFormRef.value?.resetForm()
    emit('close')
  } catch (error) {
    console.error('Failed to update claim:', error)
    const message =
      error instanceof Error
        ? error.message
        : ((error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update claim')
    toastStore.addErrorToast(message)
    errorMessage.value = { message }
  }
}

// Check restriction on mount
onMounted(async () => {
  if (teamId.value) {
    await checkRestriction(teamId.value)
  }
})
</script>
