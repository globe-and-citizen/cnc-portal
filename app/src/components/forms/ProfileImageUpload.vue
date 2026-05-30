<template>
  <!-- Upload -->
  <div class="flex items-center justify-between gap-4">
    <div
      class="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-2 bg-white transition-all duration-300"
      :style="uploadBoxStyle"
      :class="[
        imageUrl ? 'border-green-500' : 'border-dashed border-gray-400',
        { 'cursor-not-allowed opacity-60': isUploading }
      ]"
      data-test="profile-image-upload-box"
      :data-has-image="imageUrl ? 'true' : 'false'"
    >
      <!-- Background image -->
      <div
        v-if="imageUrl"
        class="absolute inset-0"
        :style="{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }"
      />

      <input
        ref="fileInput"
        type="file"
        :accept="ACCEPTED_FILE_TYPES"
        class="absolute inset-0 z-10 cursor-pointer opacity-0"
        @change="onFileChange"
        :disabled="isUploading"
        data-test="profile-image-input"
      />

      <!-- Upload label (only show when no image) -->
      <div
        v-if="!imageUrl"
        class="relative z-0 rounded-sm bg-emerald-700 px-3 py-2 text-sm font-medium text-white"
      >
        {{ isUploading ? 'Uploading...' : 'Upload image' }}
      </div>
    </div>
  </div>
  <UAlert
    v-if="errorMessage"
    color="error"
    variant="soft"
    :description="errorMessage"
    icon="i-lucide-circle-alert"
    class="mt-2"
    data-test="profile-image-error"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUploadFileMutation } from '@/queries/file.queries'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']
const ACCEPTED_FILE_TYPES = ALLOWED_IMAGE_EXTENSIONS.join(',')

const ALLOWED_IMAGE_MIMETYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/x-icon'
]

const fileInput = ref<HTMLInputElement | null>(null)
const imageUrl = defineModel<string>({ default: '' })
const validationError = ref('')
const toast = useToast()

const { mutate: uploadFile, isPending: isUploading, error: uploadError } = useUploadFileMutation()

// validationError covers synchronous guard rails (type / size); uploadError is
// the reactive mutation failure. Either drives the same UAlert.
const errorMessage = computed(() => {
  if (validationError.value) return validationError.value
  const err = uploadError.value
  if (!err) return ''
  return err instanceof Error ? err.message : 'Failed to upload image'
})

// Helper: Detect if file is image (MIME type + extension fallback)
const isImageFile = (file: File): boolean => {
  // First check MIME type
  if (ALLOWED_IMAGE_MIMETYPES.includes(file.type)) {
    return true
  }

  // Fallback: check file extension (handles cases where MIME type is missing or wrong)
  const fileName = file.name.toLowerCase()
  const extension = '.' + fileName.split('.').pop()
  return ALLOWED_IMAGE_EXTENSIONS.includes(extension)
}

// Computed style for upload box - reactive, no DOM manipulation needed
const uploadBoxStyle = computed(() => ({
  backgroundImage: imageUrl.value ? `url(${imageUrl.value})` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}))

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  validationError.value = ''

  if (!isImageFile(file)) {
    validationError.value = 'Only images (png, jpg, jpeg, webp, gif, bmp, svg) are allowed'
    toast.add({ title: validationError.value, color: 'error' })
    input.value = ''
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    validationError.value = 'Image must be 10 MB or smaller'
    toast.add({ title: validationError.value, color: 'error' })
    input.value = ''
    return
  }

  uploadFile(file, {
    onSuccess: (uploadedFileUrl) => {
      imageUrl.value = uploadedFileUrl
      toast.add({ title: 'Image uploaded', color: 'success' })
    }
  })
  input.value = ''
}
</script>
