<template>
  <!-- Upload -->
  <div class="flex items-center gap-4 justify-between">
    <div
      ref="uploadBox"
      class="w-40 h-40 border-2 border-dashed border-gray-400 rounded-full flex items-center justify-center relative overflow-hidden bg-white transition-colors duration-300"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="absolute inset-0 opacity-0 cursor-pointer z-10"
        @change="onFileChange"
      />
      <div
        ref="uploadLabel"
        class="absolute text-sm font-medium text-white bg-emerald-700 px-3 py-2 rounded z-0"
      >
        Upload image
      </div>
    </div>

    <button
      @click="uploadImage"
      class="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600"
    >
      Uploader
    </button>
  </div>
  Data: {{ uploadImageData }}
  <br />
  Loading: {{ uploadingImage }}

  {{ uploadImageError }}
</template>

<script setup lang="ts">
import { useFetch, useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import { BACKEND_URL } from '@/constant/index'

const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const uploadBox = ref<HTMLDivElement | null>(null)
const uploadLabel = ref<HTMLDivElement | null>(null)

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  selectedFile.value = file
  const reader = new FileReader()

  reader.onload = (e: ProgressEvent<FileReader>) => {
    const result = e.target?.result
    if (typeof result === 'string' && uploadBox.value && uploadLabel.value) {
      uploadBox.value.style.backgroundImage = `url(${result})`
      uploadBox.value.style.backgroundSize = 'cover'
      uploadBox.value.style.backgroundPosition = 'center'
      uploadBox.value.classList.remove('border-gray-400')
      uploadBox.value.classList.add('border-green-500')
      uploadLabel.value.classList.add('bg-opacity-70', 'text-xs', 'px-2', 'py-1')
      uploadLabel.value.innerText = ''
      uploadLabel.value.style.top = '5px'
      uploadLabel.value.style.left = '5px'
    }
  }

  reader.readAsDataURL(file)
}

const getFormData = computed(() => {
  if (!selectedFile.value) {
    return
  }
  const formData = new FormData()
  formData.append('image', selectedFile.value)
  console.log(formData)
  return formData
})

const {
  isFetching: uploadingImage,
  error: uploadImageError,
  execute: executeUploadImage,
  data: uploadImageData
} = useFetch(`${BACKEND_URL}/api/upload`, {
  immediate: false,
  async beforeFetch({ options }) {
    const token = useStorage('authToken', '')

    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token.value}`
    }
  }
})
  .post(getFormData)
  .formData()
  .json()

const uploadImage = async () => {
  await executeUploadImage()
}
</script>
