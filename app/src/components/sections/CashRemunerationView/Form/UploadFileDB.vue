<template>
  <div>
    <div
      class="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-4 cursor-pointer"
      :class="{ 'opacity-50 pointer-events-none': isUploading || disabled }"
      @click="openFileDialog"
      @dragover.prevent
      @drop.prevent="onDrop"
      data-test="upload-zone"
    >
      <div class="text-gray-500 flex flex-col items-center">
        <p>Add Screenshot or File</p>
        <p class="text-xs mt-1">{{ fileCount }}/{{ MAX_FILES }} files (10 MB max per file)</p>
      </div>

      <ButtonUI
        variant="glass"
        :loading="isUploading"
        :disabled="isUploading || disabled || fileCount >= MAX_FILES"
      >
        {{ isUploading ? 'Preparing...' : 'Select from computer' }}
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

    <FilePreviewGallery :previews="previews" @remove="removeFile" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useToastStore } from '@/stores/useToastStore'
import FilePreviewGallery from './FilePreviewGallery.vue'

/** Constants **/
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES = 10

// Allowed file types
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.txt', '.zip', '.docx']
const ACCEPTED_FILE_TYPES = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS].join(',')

const ALLOWED_IMAGE_MIMETYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const ALLOWED_DOCUMENT_MIMETYPES = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const ALLOWED_MIMETYPES = [...ALLOWED_IMAGE_MIMETYPES, ...ALLOWED_DOCUMENT_MIMETYPES]

/** Types **/
interface PreviewFile {
  previewUrl: string
  file: File
  isImage: boolean
  fileName: string
  fileSize: number
  fileType: string
}

/** Props **/
interface Props {
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

/** Emits **/
const emit = defineEmits<{
  'update:files': [files: File[]]
}>()

/** Stores **/
const { addErrorToast } = useToastStore()

/** Refs **/
const fileInput = ref<HTMLInputElement | null>(null)
const previews = ref<PreviewFile[]>([])
const isUploading = ref(false)
const errorMessage = ref<string>('')

/** Computed **/
const fileCount = computed(() => previews.value.length)

/** Helper functions **/
const isImageFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  return (
    ALLOWED_IMAGE_MIMETYPES.includes(file.type) ||
    ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  )
}

/** Actions **/
const openFileDialog = (): void => {
  if (isUploading.value || props.disabled) return
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

  // Filter valid files (images + documents)
  const validFiles = Array.from(fileList).filter((file) => {
    const lowerName = file.name.toLowerCase()
    const byMime = ALLOWED_MIMETYPES.includes(file.type)
    const byExt =
      ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext)) ||
      ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
    return byMime || byExt
  })

  if (validFiles.length === 0) {
    errorMessage.value =
      'Only images (png, jpg, jpeg, webp) and documents (pdf, txt, zip, docx) are allowed'
    addErrorToast('Only images and documents are allowed')
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

  // Create previews for files
  for (const file of validFiles) {
    const isImage = isImageFile(file)
    // Create preview URL for all files (images + docs) so we can preview/download
    const previewUrl = URL.createObjectURL(file)

    previews.value.push({
      previewUrl,
      file,
      isImage,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
  }

  emitFiles()
}

const removeFile = (index: number): void => {
  const preview = previews.value[index]
  if (preview?.previewUrl) {
    URL.revokeObjectURL(preview.previewUrl)
  }
  previews.value.splice(index, 1)
  emitFiles()
}

const emitFiles = (): void => {
  const files = previews.value.map((p) => p.file)
  emit('update:files', files)
}

const resetUpload = (): void => {
  previews.value.forEach((preview) => {
    if (preview.previewUrl) {
      URL.revokeObjectURL(preview.previewUrl)
    }
  })

  previews.value = []
  errorMessage.value = ''
  isUploading.value = false

  if (fileInput.value) {
    fileInput.value.value = ''
  }

  emit('update:files', [])
}

// Expose methods for parent component
defineExpose({
  resetUpload
})
</script>
