<template>
  <div v-if="previews.length > 0" class="mt-2" :class="props.gridClass">
    <div
      v-for="(preview, index) in previews"
      :key="preview.previewUrl"
      class="relative group"
      data-test="preview-item"
    >
      <!-- Image preview -->
      <button
        v-if="preview.isImage"
        type="button"
        :class="[
          'rounded-md object-cover w-full overflow-hidden focus:outline-none border border-gray-200 hover:border-emerald-500 transition-all bg-white',
          props.itemHeightClass,
          props.imageClass
        ]"
        @click="openLightbox(preview)"
        data-test="image-preview"
      >
        <img :src="preview.previewUrl" class="w-full h-full object-cover" :alt="preview.fileName" />
        <div
          class="pointer-events-none absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center"
        >
          <Icon
            icon="heroicons:magnifying-glass-plus"
            class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </button>

      <!-- Document preview (icon + filename) -->
      <button
        v-else
        type="button"
        :class="[
          'rounded-md w-full flex flex-col items-center justify-center p-2 transition-colors border border-gray-200 hover:border-emerald-500 overflow-hidden',
          props.itemHeightClass,
          props.documentClass
        ]"
        data-test="document-preview"
        @click="openDocumentPreview(preview)"
      >
        <Icon :icon="getFileIcon(preview.fileName)" class="w-6 h-6 text-gray-600" />
        <span
          class="text-[11px] text-gray-700 mt-1 truncate w-full text-center"
          :title="preview.fileName"
        >
          {{ truncateFileName(preview.fileName, 15) }}
        </span>
      </button>

      <!-- Remove button -->
      <button
        v-if="props.canRemove"
        class="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full bg-error text-white text-xs opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:shadow"
        @click.stop="emit('remove', index)"
        data-test="remove-button"
        aria-label="Remove file"
      >
        <Icon icon="heroicons:x-mark" class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Lightbox Modal for image previews -->
    <Teleport to="body">
      <div
        v-if="lightboxImage"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-90 p-4"
        @click="closeLightbox"
        data-test="upload-lightbox-modal"
      >
        <div
          class="relative bg-black rounded-lg max-w-4xl max-h-full flex flex-col items-center justify-center"
          @click.stop
        >
          <div class="absolute top-4 right-4 flex gap-2 z-20">
            <button
              class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80 transition-all"
              @click="closeLightbox"
              data-test="upload-lightbox-close"
            >
              <Icon icon="heroicons:x-mark" class="w-6 h-6" />
            </button>
            <button
              class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80 transition-all"
              @click="downloadCurrentImage"
              data-test="upload-lightbox-download"
              title="Download image"
            >
              <Icon icon="heroicons:arrow-down-tray" class="w-5 h-5" />
            </button>
          </div>
          <img
            :src="lightboxImage"
            :alt="lightboxFileName || 'Preview'"
            class="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    </Teleport>

    <!-- Document Preview Modal -->
    <Teleport to="body">
      <div
        v-if="docPreviewUrl"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-80 p-4"
        @click="closeDocumentPreview"
        data-test="upload-doc-modal"
      >
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full h-[80vh] p-4 flex flex-col"
          @click.stop
        >
          <div class="flex justify-between items-center mb-3">
            <div class="font-semibold text-gray-800 truncate" :title="docPreviewName">
              {{ docPreviewName }}
            </div>
            <div class="flex gap-2">
              <button
                class="btn btn-sm btn-ghost"
                @click="closeDocumentPreview"
                data-test="upload-doc-close"
              >
                Close
              </button>
              <button
                class="btn btn-sm btn-success"
                @click="downloadCurrentDocument"
                data-test="upload-doc-download"
              >
                Download
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-hidden rounded border border-gray-200 bg-gray-50">
            <!-- PDF Preview -->
            <iframe
              v-if="
                docPreviewType?.includes('pdf') || docPreviewName.toLowerCase().endsWith('.pdf')
              "
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
              >{{ docTextContent }}</pre
            >

            <!-- Non-previewable files -->
            <div v-else class="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
              <Icon :icon="getFileIcon(docPreviewName)" class="w-24 h-24 text-gray-400" />
              <div class="text-center">
                <div class="text-xl font-semibold text-gray-700 mb-2">{{ docPreviewName }}</div>
                <div class="text-sm text-gray-500 mb-4">
                  Type: {{ docPreviewType || 'Unknown' }}
                </div>
                <p class="text-gray-600 mb-6">This file type cannot be previewed in the browser.</p>
                <button class="btn btn-success" @click="downloadCurrentDocument">
                  <Icon icon="heroicons:arrow-down-tray" class="w-5 h-5 mr-2" />
                  Download to view
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, watch } from 'vue'

interface PreviewItem {
  previewUrl: string
  fileName: string
  fileSize: number
  fileType?: string
  isImage: boolean
}

const props = withDefaults(
  defineProps<{
    previews: PreviewItem[]
    canRemove?: boolean
    gridClass?: string
    itemHeightClass?: string
    imageClass?: string
    documentClass?: string
  }>(),
  {
    canRemove: true,
    gridClass: 'grid grid-cols-6 sm:grid-cols-8 gap-2',
    itemHeightClass: 'h-16',
    imageClass: '',
    documentClass: 'bg-gray-50 hover:bg-gray-100'
  }
)

const emit = defineEmits<{
  remove: [index: number]
}>()

const lightboxImage = ref<string | null>(null)
const lightboxFileName = ref<string>('')
const docPreviewUrl = ref<string | null>(null)
const docPreviewName = ref<string>('')
const docPreviewType = ref<string>('')
const docTextContent = ref<string>('')

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

const decodeTextFile = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url)
    const text = await res.text()
    return text || 'File is empty'
  } catch (error) {
    console.error('Error decoding text file:', error)
    return 'Error reading file content'
  }
}

const openLightbox = (preview: PreviewItem): void => {
  lightboxImage.value = preview.previewUrl
  lightboxFileName.value = preview.fileName
}

const closeLightbox = (): void => {
  lightboxImage.value = null
  lightboxFileName.value = ''
}

const downloadCurrentImage = (): void => {
  if (!lightboxImage.value) return
  const link = document.createElement('a')
  link.href = lightboxImage.value
  link.download = lightboxFileName.value || 'image'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const openDocumentPreview = (preview: PreviewItem): void => {
  docPreviewUrl.value = preview.previewUrl
  docPreviewName.value = preview.fileName
  docPreviewType.value = preview.fileType || ''
  docTextContent.value = ''

  if (
    docPreviewType.value?.includes('text/plain') ||
    docPreviewName.value.toLowerCase().endsWith('.txt')
  ) {
    decodeTextFile(preview.previewUrl).then((text) => {
      docTextContent.value = text
    })
  }
}

const closeDocumentPreview = (): void => {
  docPreviewUrl.value = null
  docPreviewName.value = ''
  docPreviewType.value = ''
  docTextContent.value = ''
}

const downloadCurrentDocument = (): void => {
  if (!docPreviewUrl.value) return
  const link = document.createElement('a')
  link.href = docPreviewUrl.value
  link.download = docPreviewName.value || 'document'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

watch(
  () => props.previews,
  (next) => {
    const urls = next.map((p) => p.previewUrl)
    if (lightboxImage.value && !urls.includes(lightboxImage.value)) {
      closeLightbox()
    }
    if (docPreviewUrl.value && !urls.includes(docPreviewUrl.value)) {
      closeDocumentPreview()
    }
  },
  { deep: true }
)
</script>
