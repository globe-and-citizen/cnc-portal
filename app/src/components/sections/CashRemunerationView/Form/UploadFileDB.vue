<template>
  <div>
    <UFileUpload
      v-model="internalFiles"
      multiple
      :accept="ACCEPTED_FILE_TYPES"
      :disabled="isUploading || disabled || fileCount >= MAX_FILES"
      @update:model-value="onFilesUpdate"
    >
      <template #default="{ open }">
        <div
          class="border-2 border-dashed border-gray-400 dark:border-gray-500 rounded-lg p-6 flex flex-col items-center gap-4 cursor-pointer"
          :class="{ 'opacity-50 pointer-events-none': isUploading || disabled }"
          @click="open()"
          data-test="upload-zone"
        >
          <div class="text-gray-500 flex flex-col items-center">
            <p>Add Screenshot or File</p>
            <p class="text-xs mt-1">{{ fileCount }}/{{ MAX_FILES }} files (10 MB max per file)</p>
          </div>

          <UButton
            variant="outline"
            color="neutral"
            :loading="isUploading"
            :disabled="isUploading || disabled || fileCount >= MAX_FILES"
            @click.stop="open()"
          >
            {{ isUploading ? 'Preparing...' : 'Select from computer' }}
          </UButton>
        </div>
      </template>
    </UFileUpload>

    <!-- Error message -->
    <div v-if="errorMessage" class="mt-2 text-red-500 text-sm" data-test="upload-error">
      {{ errorMessage }}
    </div>

    <FilePreviewGallery :previews="previews" @remove="removeFile" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import * as z from 'zod'
import FilePreviewGallery from './FilePreviewGallery.vue'
import {
  ACCEPTED_FILE_TYPES,
  ALLOWED_DOCUMENT_EXTENSIONS,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIMETYPES,
  ALLOWED_MIMETYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
  type PreviewFile
} from '@/types/upload'

/** Props **/
interface Props {
  disabled?: boolean
  existingFileCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  existingFileCount: 0
})

/** Emits **/
const emit = defineEmits<{
  'update:files': [files: File[]]
}>()

/** Stores **/
const toast = useToast()

/** Refs **/
const internalFiles = ref<File[]>([])
const previews = ref<PreviewFile[]>([])
const isUploading = ref(false)
const errorMessage = ref<string>('')

/** Computed **/
const fileCount = computed(() => previews.value.length + props.existingFileCount)

/** Zod schema **/
const fileSchema = z
  .instanceof(File)
  .refine(
    (file) => {
      const lowerName = file.name.toLowerCase()
      const byMime = ALLOWED_MIMETYPES.includes(file.type)
      const byExt =
        ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext)) ||
        ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
      return byMime || byExt
    },
    {
      message: 'Only images (png, jpg, jpeg, webp) and documents (pdf, txt, zip, docx) are allowed'
    }
  )
  .refine((file) => file.size <= MAX_FILE_SIZE, {
    message: `File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)} MB limit`
  })

const filesSchema = z
  .array(fileSchema)
  .max(MAX_FILES, { message: `Maximum ${MAX_FILES} files allowed` })

/** Helper functions **/
const isImageFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  return (
    ALLOWED_IMAGE_MIMETYPES.includes(file.type) ||
    ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  )
}

/** Actions **/
const onFilesUpdate = (newFiles: File[] | File | null | undefined): void => {
  errorMessage.value = ''

  const fileList = newFiles ? (Array.isArray(newFiles) ? newFiles : [newFiles]) : []

  const allFiles = [...previews.value.map((p) => p.file), ...fileList]

  const result = filesSchema.safeParse(allFiles)

  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? 'Invalid file'
    errorMessage.value = firstError
    toast.add({ title: firstError, color: 'error' })
    internalFiles.value = []
    return
  }

  // Add only new files to previews
  for (const file of fileList) {
    const isImage = isImageFile(file)
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
  internalFiles.value = previews.value.map((p) => p.file)
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
  internalFiles.value = []
  errorMessage.value = ''
  isUploading.value = false

  emit('update:files', [])
}

defineExpose({ resetUpload })
</script>
