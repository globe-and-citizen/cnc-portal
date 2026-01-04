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
      @preview-image="openImagePreview"
      @preview-document="openDocumentPreview"
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

  <!-- Lightbox Modal for Image Preview -->
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
            class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80 transition-all"
            @click="downloadCurrentImage"
            data-test="lightbox-download-button"
            title="Download image"
          >
            <IconifyIcon icon="heroicons:arrow-down-tray" class="w-5 h-5" />
          </button>
          <button
            class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80 transition-all"
            @click="closeLightbox"
            data-test="lightbox-close-button"
          >
            <IconifyIcon icon="heroicons:x-mark" class="w-6 h-6" />
          </button>
        </div>
        <img
          :src="lightboxImage"
          alt="Full size screenshot"
          class="max-w-full max-h-full object-contain"
          @click.stop
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
            <button
              class="btn btn-sm btn-ghost"
              @click="closeDocPreview"
              data-test="doc-close-button"
            >
              Close
            </button>
            <button
              class="btn btn-sm btn-success"
              @click="downloadCurrentDocument"
              data-test="doc-download-button"
            >
              <IconifyIcon icon="heroicons:arrow-down-tray" class="w-4 h-4 mr-1" />
              Download
            </button>
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
              <button class="btn btn-success" @click="downloadCurrentDocument">
                <IconifyIcon icon="heroicons:arrow-down-tray" class="w-5 h-5 mr-2" />
                Download to view
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, watchEffect } from 'vue'
import ClaimForm from '@/components/sections/CashRemunerationView/Form/ClaimForm.vue'
import { useSubmitRestriction } from '@/composables'
import { useToastStore, useTeamStore } from '@/stores'
import type { Claim, ClaimFormData, ClaimSubmitPayload } from '@/types'
import { useQueryClient } from '@tanstack/vue-query'
import { BACKEND_URL } from '@/constant'
import { useStorage } from '@vueuse/core'
import { Icon as IconifyIcon } from '@iconify/vue'

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
const existingFiles = ref<any[]>([])
const deletedFileIndexes = ref<number[]>([])
const lightboxImage = ref<string | null>(null)
const currentLightboxFile = ref<any | null>(null)
const docPreviewUrl = ref<string | null>(null)
const docPreviewName = ref<string>('')
const docPreviewType = ref<string>('')

// Load existing files
onMounted(() => {
  // Reset deleted indexes when loading
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
    // Reset deleted indexes when syncing files
    deletedFileIndexes.value = []
    existingFiles.value = Array.isArray(props.claim.fileAttachments)
      ? [...props.claim.fileAttachments]
      : []
  }
})

// Helper functions for file display
const getFileDataUrl = (file: any): string => {
  return `data:${file.fileType};base64,${file.fileData}`
}

const isImageFile = (file: any): boolean => {
  return file.fileType.startsWith('image/')
}

const getFileIcon = (file: any): string => {
  if (file.fileType === 'application/pdf') return 'heroicons:document-text'
  if (file.fileType.includes('zip')) return 'heroicons:archive-box'
  if (file.fileType.includes('word')) return 'heroicons:document'
  return 'heroicons:document'
}

const decodeTextFile = (dataUrl: string): string => {
  try {
    const base64Data = dataUrl.split(',')[1]
    if (!base64Data) return 'Unable to decode file content'
    const decodedText = atob(base64Data)
    return decodedText || 'File is empty'
  } catch (error) {
    console.error('Error decoding text file:', error)
    return 'Error reading file content'
  }
}

// Lightbox functions for images
const openLightbox = (imageUrl: string, file: any) => {
  lightboxImage.value = imageUrl
  currentLightboxFile.value = file
}

const closeLightbox = () => {
  lightboxImage.value = null
  currentLightboxFile.value = null
}

const openLightboxFromFile = (file: any) => {
  openLightbox(getFileDataUrl(file), file)
}

const downloadCurrentImage = () => {
  if (!currentLightboxFile.value || !lightboxImage.value) return
  const link = document.createElement('a')
  link.href = lightboxImage.value
  link.download = currentLightboxFile.value.fileName || 'image'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

// Document preview functions
const openDocumentPreview = (file: any) => {
  docPreviewUrl.value = getFileDataUrl(file)
  docPreviewName.value = file.fileName
  docPreviewType.value = file.fileType
}

const closeDocPreview = () => {
  docPreviewUrl.value = null
  docPreviewName.value = ''
  docPreviewType.value = ''
}

const downloadCurrentDocument = () => {
  if (!docPreviewUrl.value) return
  const link = document.createElement('a')
  link.href = docPreviewUrl.value
  link.download = docPreviewName.value || 'attachment'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

// Open image preview in lightbox
const openImagePreview = (file: any) => {
  console.log('openImagePreview called with:', file.fileName)
  openLightboxFromFile(file)
}

// Delete file function - only updates local state, actual deletion happens on Update
const deleteFile = (fileIndex: number) => {
  // Track the original index for server-side deletion on update
  // We need to map the current visible index to the original file index
  let originalIndex = fileIndex
  // Account for previously deleted indexes to get the real server-side index
  for (const deletedIdx of deletedFileIndexes.value.sort((a, b) => a - b)) {
    if (deletedIdx <= originalIndex) {
      originalIndex++
    }
  }
  deletedFileIndexes.value.push(originalIndex)

  // Remove from local display
  existingFiles.value = existingFiles.value.filter((_, i) => i !== fileIndex)
  console.log('Files marked for deletion on update. Remaining files:', existingFiles.value.length)
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
