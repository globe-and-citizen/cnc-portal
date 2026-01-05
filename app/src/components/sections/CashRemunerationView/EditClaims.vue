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

    <!-- File Preview Gallery for existing files -->
    <FilePreviewGallery
      v-if="previewItems.length > 0"
      :previews="previewItems"
      can-remove
      grid-class="grid grid-cols-6 sm:grid-cols-8 gap-2"
      item-height-class="h-16"
      @remove="deleteFile"
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
import FilePreviewGallery from '@/components/sections/CashRemunerationView/Form/FilePreviewGallery.vue'
import { useSubmitRestriction } from '@/composables'
import { useToastStore, useTeamStore } from '@/stores'
import type { Claim, ClaimFormData, ClaimSubmitPayload, FileAttachment } from '@/types'
import { useQueryClient } from '@tanstack/vue-query'
import { BACKEND_URL } from '@/constant'
import { useStorage } from '@vueuse/core'

interface PreviewItem {
  previewUrl: string
  fileName: string
  fileSize: number
  fileType?: string
  isImage: boolean
}

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

const isUpdating = ref(false)
const authToken = useStorage('authToken', '')
const existingFiles = ref<FileAttachment[]>([])
const deletedFileIndexes = ref<number[]>([])

// Convert FileAttachment to PreviewItem for FilePreviewGallery
const previewItems = computed<PreviewItem[]>(() => {
  return existingFiles.value.map((file) => ({
    previewUrl: file.fileData ? `data:${file.fileType};base64,${file.fileData}` : '',
    fileName: file.fileName,
    fileSize: file.fileSize,
    fileType: file.fileType,
    isImage: file.fileType?.startsWith('image/') ?? false
  }))
})

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

const updateClaim = async (data: ClaimSubmitPayload & { files?: File[] }) => {
  errorMessage.value = null
  if (!teamId.value) {
    toastStore.addErrorToast('Team not selected')
    return
  }

  const formData = new FormData()
  formData.append('hoursWorked', data.hoursWorked.toString())
  formData.append('memo', data.memo)
  formData.append('dayWorked', data.dayWorked)
  if (data.files && data.files.length > 0) {
    data.files.forEach((file) => formData.append('files', file))
  }
  // Send deleted file indexes to the server
  if (deletedFileIndexes.value.length > 0) {
    formData.append('deletedFileIndexes', JSON.stringify(deletedFileIndexes.value))
  }

  isUpdating.value = true
  try {
    const response = await fetch(`${BACKEND_URL}/api/claim/${props.claim.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${authToken.value}`
      },
      body: formData
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Failed to update claim' }))
      throw new Error(err.message || 'Failed to update claim')
    }

    toastStore.addSuccessToast('Claim updated successfully')

    // Reset deleted file indexes after successful update
    deletedFileIndexes.value = []

    await queryClient.invalidateQueries({
      queryKey: ['weekly-claims', teamStore.currentTeamId]
    })

    claimFormRef.value?.resetForm()
    emit('close')
  } catch (error) {
    console.error('Failed to update claim:', error)
    const message = (error as Error)?.message || 'Failed to update claim'
    toastStore.addErrorToast(message)
    errorMessage.value = { message }
  } finally {
    isUpdating.value = false
  }
}

// Check restriction on mount
onMounted(async () => {
  if (teamId.value) {
    await checkRestriction(teamId.value)
  }
})
</script>
