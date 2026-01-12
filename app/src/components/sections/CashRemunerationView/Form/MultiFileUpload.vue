<template>
  <div>
    <div
      class="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-4 cursor-pointer"
      :class="{ 'opacity-50 pointer-events-none': isUploading }"
      @click="openFileDialog"
      @dragover.prevent
      @drop.prevent="onDrop"
      data-test="upload-zone"
    >
      <div class="text-gray-500 flex flex-col items-center">
        <p>Add Screenshot or File</p>
        <p class="text-xs mt-1">Maximum 10 files (10 MB max per file)</p>
      </div>

      <ButtonUI variant="glass" :loading="isUploading" :disabled="isUploading">
        {{ isUploading ? 'Uploading...' : 'Select from computer' }}
      </ButtonUI>

      <!-- Hidden file input -->
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="ACCEPTED_FILE_TYPES"
        multiple
        @change="onSelectFiles"
        data-test="file-input"
      />
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="mt-2 text-red-500 text-sm" data-test="upload-error">
      {{ errorMessage }}
    </div>

    <!-- Preview grid -->
    <div v-if="previews.length > 0" class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div
        v-for="(preview, index) in previews"
        :key="index"
        class="relative"
        data-test="preview-item"
      >
        <!-- Image preview -->
        <img
          v-if="preview.isImage"
          :src="preview.metadata?.fileUrl || preview.previewUrl"
          class="rounded-lg shadow object-cover w-full h-32"
          :class="{ 'opacity-50': preview.isUploading }"
          alt="Preview"
          data-test="image-preview"
        />

        <!-- Document preview (icon + filename) -->
        <div
          v-else
          class="rounded-lg shadow bg-gray-100 w-full h-32 flex flex-col items-center justify-center p-2"
          :class="{ 'opacity-50': preview.isUploading }"
          data-test="document-preview"
        >
          <Icon :icon="getFileIcon(preview.fileName)" class="w-10 h-10 text-gray-600" />
          <span
            class="text-xs text-gray-700 mt-2 truncate w-full text-center"
            :title="preview.fileName"
          >
            {{ truncateFileName(preview.fileName, 15) }}
          </span>
        </div>

        <!-- Loading overlay -->
        <div
          v-if="preview.isUploading"
          class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg"
        >
          <span class="loading loading-spinner loading-md text-white"></span>
        </div>

        <!-- Remove button (only if not uploading) -->
        <button
          v-if="!preview.isUploading"
          class="btn btn-xs btn-error absolute top-1 right-1"
          @click.stop="removeFile(index)"
          data-test="remove-button"
        >
          X
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { Icon } from '@iconify/vue'
import { ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { useToastStore } from '@/stores/useToastStore'
import { BACKEND_URL } from '@/constant/index'

/** Constants **/
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES = 10

// Allowed image extensions and MIME types
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']
const ALLOWED_IMAGE_MIMETYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml'
]

// Allowed document extensions and MIME types
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.txt', '.zip', '.docx']
const ALLOWED_DOCUMENT_MIMETYPES = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

// Combined allowed file types for input accept attribute
const ACCEPTED_FILE_TYPES = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS].join(',')

/** Types **/
interface FileMetadata {
  fileKey: string
  fileUrl: string
  fileType: string
  fileSize: number
}

interface PreviewFile {
  previewUrl: string
  metadata?: FileMetadata
  isUploading: boolean
  isImage: boolean
  fileName: string
}

/** Emits **/
const emit = defineEmits<{
  'update:screens': [metadata: FileMetadata[]]
}>()

/** Stores **/
const { addErrorToast } = useToastStore()

/** Auth token - récupéré une seule fois **/
const authToken = useStorage('authToken', '')

/** Refs **/
const fileInput = ref<HTMLInputElement | null>(null)
const previews = ref<PreviewFile[]>([])
const isUploading = ref(false)
const errorMessage = ref<string>('')

/** Helper functions **/
const isImageFile = (file: File): boolean => {
  if (ALLOWED_IMAGE_MIMETYPES.includes(file.type)) return true
  const ext = '.' + file.name.toLowerCase().split('.').pop()
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext)
}

const isDocumentFile = (file: File): boolean => {
  if (ALLOWED_DOCUMENT_MIMETYPES.includes(file.type)) return true
  const ext = '.' + file.name.toLowerCase().split('.').pop()
  return ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)
}

const isAllowedFile = (file: File): boolean => {
  return isImageFile(file) || isDocumentFile(file)
}

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'pdf':
      return 'heroicons:document-text'
    case 'zip':
      return 'heroicons:archive-box'
    case 'docx':
    case 'doc':
      return 'heroicons:document'
    case 'txt':
      return 'heroicons:document-text'
    default:
      return 'heroicons:paper-clip'
  }
}

const truncateFileName = (name: string, maxLength: number): string => {
  if (name.length <= maxLength) return name
  const ext = name.split('.').pop() || ''
  const baseName = name.slice(0, name.length - ext.length - 1)
  const truncatedBase = baseName.slice(0, maxLength - ext.length - 4)
  return `${truncatedBase}...${ext}`
}

/** Actions **/
const openFileDialog = (): void => {
  if (isUploading.value) return
  fileInput.value?.click()
}

const onSelectFiles = async (event: Event): Promise<void> => {
  const target = event.target as HTMLInputElement
  if (!target.files) return
  await handleFiles(target.files)
  // Reset input to allow same file selection
  target.value = ''
}

const onDrop = async (event: DragEvent): Promise<void> => {
  if (!event.dataTransfer?.files) return
  await handleFiles(event.dataTransfer.files)
}

const handleFiles = async (fileList: FileList): Promise<void> => {
  errorMessage.value = ''

  // Filter valid files (images and documents)
  const validFiles = Array.from(fileList).filter((file) => {
    const allowed = isAllowedFile(file)
    if (!allowed) {
      console.warn('Rejected file (not allowed type):', {
        name: file.name,
        type: file.type,
        size: file.size
      })
    }
    return allowed
  })

  if (validFiles.length === 0) {
    errorMessage.value =
      'Only images (png, jpg, jpeg, webp, gif, bmp, svg) and documents (pdf, txt, zip, docx) are allowed'
    addErrorToast('Invalid file type')
    return
  }

  // Check file size
  const oversizedFiles = validFiles.filter((file) => file.size > MAX_FILE_SIZE)
  if (oversizedFiles.length > 0) {
    errorMessage.value = `Some files exceed the ${MAX_FILE_SIZE / (1024 * 1024)} MB limit`
    addErrorToast(
      `File(s) exceed the ${MAX_FILE_SIZE / (1024 * 1024)} MB limit: ${oversizedFiles.map((f) => f.name).join(', ')}`
    )
    return
  }

  // Check total limit
  if (previews.value.length + validFiles.length > MAX_FILES) {
    errorMessage.value = `Maximum ${MAX_FILES} files allowed`
    addErrorToast(`Maximum ${MAX_FILES} files allowed`)
    return
  }

  // Create previews and upload files
  isUploading.value = true

  for (const file of validFiles) {
    const isImage = isImageFile(file)
    // Create preview URL only for images
    const previewUrl = isImage ? URL.createObjectURL(file) : ''
    const previewIndex = previews.value.length

    previews.value.push({
      previewUrl,
      isUploading: true,
      isImage,
      fileName: file.name
    })

    // Upload file
    try {
      const uploadedMetadata = await uploadFile(file)
      const preview = previews.value[previewIndex]
      if (preview) {
        preview.metadata = uploadedMetadata
        preview.isUploading = false
      }
    } catch (error) {
      console.error('Upload error:', error)
      // Remove failed upload from previews
      previews.value.splice(previewIndex, 1)
      if (isImage && previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      errorMessage.value = 'Failed to upload some files'
      addErrorToast(`Failed to upload file: ${file.name}`)
    }
  }

  isUploading.value = false
  emitUploadedMetadata()
}

const uploadFile = async (file: File): Promise<FileMetadata> => {
  const formData = new FormData()
  formData.append('file', file) // Use 'file' field (unified endpoint)

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken.value}`
    },
    body: formData
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('Upload failed:', errorData)
    throw new Error(errorData?.error || 'Upload failed')
  }

  const data = await response.json()

  if (!data?.fileUrl || !data?.fileKey || !data?.metadata) {
    console.error('Upload response missing required fields:', data)
    throw new Error('Upload failed: Invalid response format')
  }

  // Return complete metadata for backend claim submission
  return {
    fileKey: data.fileKey,
    fileUrl: data.fileUrl,
    fileType: data.metadata.fileType,
    fileSize: data.metadata.fileSize
  }
}

const removeFile = (index: number): void => {
  const preview = previews.value[index]
  // Only revoke object URL for images (documents don't have preview URLs)
  if (preview?.isImage && preview?.previewUrl) {
    URL.revokeObjectURL(preview.previewUrl)
  }
  previews.value.splice(index, 1)
  emitUploadedMetadata()
}

const emitUploadedMetadata = (): void => {
  const uploadedMetadata = previews.value
    .filter((p) => p.metadata && !p.isUploading)
    .map((p) => p.metadata!)

  emit('update:screens', uploadedMetadata)
}

const resetUpload = (): void => {
  // Clean up object URLs (only for images)
  previews.value.forEach((preview) => {
    if (preview.isImage && preview.previewUrl) {
      URL.revokeObjectURL(preview.previewUrl)
    }
  })

  previews.value = []
  errorMessage.value = ''
  isUploading.value = false

  if (fileInput.value) {
    fileInput.value.value = ''
  }

  emit('update:screens', [])
}

// Expose methods for parent component
defineExpose({
  resetUpload
})
</script>
