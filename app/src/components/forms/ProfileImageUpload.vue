<template>
  <!-- Upload -->
  <div class="flex items-center gap-4 justify-between">
    <div
      class="w-40 h-40 border-2 rounded-full flex items-center justify-center relative overflow-hidden bg-white transition-all duration-300"
      :style="uploadBoxStyle"
      :class="[
        imageUrl ? 'border-green-500' : 'border-dashed border-gray-400',
        { 'opacity-60 cursor-not-allowed': isUploading }
      ]"
      data-test="profile-image-upload-box"
    >
      <!-- Background image -->
      <div
        v-if="imageUrl"
        class="absolute inset-0"
        :style="{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
      />
      
      <input
        ref="fileInput"
        type="file"
        :accept="ACCEPTED_FILE_TYPES"
        class="absolute inset-0 opacity-0 cursor-pointer z-10"
        @change="onFileChange"
        :disabled="isUploading"
        data-test="profile-image-input"
      />
      
      <!-- Upload label (only show when no image) -->
      <div
        v-if="!imageUrl"
        class="relative text-sm font-medium text-white bg-emerald-700 px-3 py-2 rounded z-0"
      >
        {{ isUploading ? 'Uploading...' : 'Upload image' }}
      </div>
    </div>
  </div>
  <p v-if="errorMessage" class="text-sm text-red-500 mt-2" data-test="profile-image-error">
    {{ errorMessage }}
  </p>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { BACKEND_URL } from '@/constant/index'
import { useToastStore } from '@/stores'

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
const isUploading = ref(false)
const errorMessage = ref('')
const authToken = useStorage('authToken', '')
const { addErrorToast, addSuccessToast } = useToastStore()

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

const onFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  errorMessage.value = ''

  if (!isImageFile(file)) {
    errorMessage.value = 'Only images (png, jpg, jpeg, webp, gif, bmp, svg) are allowed'
    addErrorToast('Only images (png, jpg, jpeg, webp, gif, bmp, svg) are allowed')
    input.value = ''
    return
  }

  if (file.size > MAX_FILE_SIZE) {
    errorMessage.value = 'Image must be 10 MB or smaller'
    addErrorToast('Image must be 10 MB or smaller')
    input.value = ''
    return
  }

  await uploadSelectedFile(file)
  input.value = ''
}

const uploadSelectedFile = async (file: File) => {
  isUploading.value = true
  errorMessage.value = ''

  try {
    const formData = new FormData()
    formData.append('image', file)

    const headers: Record<string, string> = {}
    if (authToken.value) {
      headers.Authorization = `Bearer ${authToken.value}`
    }

    const response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      headers,
      body: formData
    })

    const responseBody = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(responseBody?.error || 'Failed to upload image')
    }

    if (!responseBody?.imageUrl) {
      throw new Error('Upload response missing imageUrl')
    }

    imageUrl.value = responseBody.imageUrl
    addSuccessToast('Image uploaded')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image'
    errorMessage.value = message
    addErrorToast(message)
  } finally {
    isUploading.value = false
  }
}
</script>
