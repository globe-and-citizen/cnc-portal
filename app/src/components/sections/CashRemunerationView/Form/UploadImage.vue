<template>
  <div
    class="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center gap-4 cursor-pointer"
    @click="openFileDialog"
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <div class="text-gray-500 flex flex-col items-center">
      <!-- <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m-4 4l-4-4m0 0l-4 4m4-4v12"
        />
      </svg> -->
      <p>Add Screenshot or Video record</p>
    </div>

    <ButtonUI variant="glass"> Select from computer </ButtonUI>

    <!-- Input file caché -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      accept="image/*,video/*"
      multiple
      @change="onSelectFiles"
    />
  </div>

  <!-- Prévisualisation -->
  <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
    <div v-for="(file, index) in previews" :key="index" class="relative">
      <img v-if="file.isImage" :src="file.url" class="rounded-lg shadow object-cover w-full h-32" />

      <video v-else controls class="rounded-lg shadow w-full h-32 object-cover">
        <source :src="file.url" />
      </video>

      <button class="btn btn-xs btn-error absolute top-1 right-1" @click="removeFile(index)">
        X
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import ButtonUI from '@/components/ButtonUI.vue'
import { ref } from 'vue'

/** Types **/
interface PreviewFile {
  url: string
  isImage: boolean
}

/** Refs **/
const fileInput = ref<HTMLInputElement | null>(null)
const files = ref<File[]>([])
const previews = ref<PreviewFile[]>([])

/** Actions **/
const openFileDialog = (): void => {
  fileInput.value?.click()
}

const onSelectFiles = (event: Event): void => {
  const target = event.target as HTMLInputElement
  if (!target.files) return
  handleFiles(target.files)
}

const onDrop = (event: DragEvent): void => {
  if (!event.dataTransfer?.files) return
  handleFiles(event.dataTransfer.files)
}

const handleFiles = (fileList: FileList): void => {
  Array.from(fileList).forEach((file) => {
    files.value.push(file)

    const isImage = file.type.startsWith('image/')
    const url = URL.createObjectURL(file)

    previews.value.push({ url, isImage })
  })
}

const removeFile = (index: number): void => {
  files.value.splice(index, 1)
  previews.value.splice(index, 1)
}
</script>
