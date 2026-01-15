<template>
  <div v-if="resolvedPreviews.length > 0" class="mt-2" :class="gridClass">
    <div
      v-for="(preview, index) in resolvedPreviews"
      :key="preview.previewUrl || preview.key || index"
      class="relative group"
      data-test="preview-item"
    >
      <!-- Image preview -->
      <button
        v-if="preview.isImage && preview.previewUrl"
        type="button"
        :class="[
          'group relative overflow-hidden rounded-md w-full focus:outline-none border border-gray-200 hover:border-emerald-500 transition-all',
          itemHeightClass,
          imageClass
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

      <!-- Loading state for S3 images -->
      <div
        v-else-if="preview.isImage && !preview.previewUrl && preview.key"
        :class="[
          'rounded-md w-full flex flex-col items-center justify-center bg-gray-100 border border-gray-200',
          itemHeightClass
        ]"
        data-test="image-loading"
      >
        <span class="loading loading-spinner loading-sm text-gray-400"></span>
        <span class="text-[10px] text-gray-500 mt-1">Loading...</span>
      </div>

      <!-- Document preview -->
      <button
        v-else
        type="button"
        :class="[
          'rounded-md w-full flex flex-col items-center justify-center p-2 transition-colors border border-gray-200 hover:border-emerald-500 overflow-hidden',
          itemHeightClass,
          documentClass
        ]"
        data-test="document-preview"
        @click="openDocumentPreview(preview)"
      >
        <Icon :icon="getFileIcon(preview.fileName)" class="w-6 h-6 text-gray-600" />
        <span
          class="text-[11px] text-gray-700 mt-1 truncate w-full text-center"
          :title="preview.fileName"
        >
          {{ truncateFileName(preview.fileName) }}
        </span>
      </button>

      <!-- Remove button -->
      <button
        v-if="canRemove"
        class="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center rounded-full bg-error text-white text-xs opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:shadow"
        @click.stop="emit('remove', index)"
        data-test="remove-button"
        aria-label="Remove file"
      >
        <Icon icon="heroicons:x-mark" class="w-3 h-3" />
      </button>
    </div>

    <!-- Lightbox Modal -->
    <Teleport to="body">
      <div
        v-if="lightbox.isOpen"
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
              class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80"
              @click="closeLightbox"
              data-test="upload-lightbox-close"
            >
              <Icon icon="heroicons:x-mark" class="w-6 h-6" />
            </button>
            <button
              class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80"
              @click="openInNewTab(lightbox.url)"
              data-test="upload-lightbox-download"
              title="Download image"
            >
              <Icon icon="heroicons:arrow-down-tray" class="w-5 h-5" />
            </button>
          </div>
          <img
            :src="lightbox.url"
            :alt="lightbox.fileName"
            class="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    </Teleport>

    <!-- Document Preview Modal -->
    <Teleport to="body">
      <div
        v-if="docPreview.isOpen"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-80 p-4"
        @click="closeDocumentPreview"
        data-test="upload-doc-modal"
      >
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full h-[80vh] p-4 flex flex-col"
          @click.stop
        >
          <div class="flex justify-between items-center mb-3">
            <div class="font-semibold text-gray-800 truncate" :title="docPreview.fileName">
              {{ docPreview.fileName }}
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
                @click="openInNewTab(docPreview.url)"
                data-test="upload-doc-download"
              >
                Download
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-hidden rounded border border-gray-200 bg-gray-50">
            <!-- PDF Preview -->
            <iframe
              v-if="docPreview.isPdf"
              :src="docPreview.url"
              class="w-full h-full"
              title="Document preview"
            ></iframe>

            <!-- Text File Preview -->
            <pre
              v-else-if="docPreview.isText"
              class="w-full h-full p-4 overflow-auto whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white"
              >{{ docPreview.textContent }}</pre
            >

            <!-- Non-previewable files -->
            <div v-else class="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
              <Icon :icon="getFileIcon(docPreview.fileName)" class="w-24 h-24 text-gray-400" />
              <div class="text-center">
                <div class="text-xl font-semibold text-gray-700 mb-2">
                  {{ docPreview.fileName }}
                </div>
                <div class="text-sm text-gray-500 mb-4">
                  Type: {{ docPreview.fileType || 'Unknown' }}
                </div>
                <p class="text-gray-600 mb-6">This file type cannot be previewed in the browser.</p>
                <button class="btn btn-success" @click="openInNewTab(docPreview.url)">
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
import { ref, watch, computed, onMounted, reactive } from 'vue'
import { getPresignedUrl } from '@/composables/useFileUrl'

interface PreviewItem {
  previewUrl: string
  fileName: string
  fileSize: number
  fileType?: string
  isImage: boolean
  key?: string
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

// Cache for presigned URLs
const resolvedUrls = ref<Map<string, string>>(new Map())

// Computed previews with resolved URLs
const resolvedPreviews = computed(() => {
  return props.previews.map((preview) => {
    if (preview.key && !preview.previewUrl) {
      const cachedUrl = resolvedUrls.value.get(preview.key)
      if (cachedUrl) return { ...preview, previewUrl: cachedUrl }
    }
    return preview
  })
})

// Load presigned URLs in parallel
async function loadPresignedUrls() {
  const keysToFetch = props.previews
    .filter((p) => p.key && !p.previewUrl && !resolvedUrls.value.has(p.key))
    .map((p) => p.key!)

  if (keysToFetch.length === 0) return

  const results = await Promise.allSettled(
    keysToFetch.map(async (key) => ({
      key,
      url: await getPresignedUrl(key)
    }))
  )

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.url) {
      resolvedUrls.value.set(result.value.key, result.value.url)
    }
  }

  resolvedUrls.value = new Map(resolvedUrls.value)
}

onMounted(loadPresignedUrls)
watch(() => props.previews, loadPresignedUrls, { deep: true })

// Lightbox state
const lightbox = reactive({
  isOpen: false,
  url: '',
  fileName: ''
})

// Document preview state
const docPreview = reactive({
  isOpen: false,
  url: '',
  fileName: '',
  fileType: '',
  textContent: '',
  isPdf: false,
  isText: false
})

// File icon mapping
const FILE_ICONS: Record<string, string> = {
  pdf: 'heroicons:document-text',
  zip: 'heroicons:archive-box',
  docx: 'heroicons:document',
  doc: 'heroicons:document',
  txt: 'heroicons:document-text'
}

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return FILE_ICONS[ext] || 'heroicons:paper-clip'
}

const truncateFileName = (name: string, maxLength = 15): string => {
  if (name.length <= maxLength) return name
  const ext = name.split('.').pop() || ''
  const baseName = name.slice(0, name.length - ext.length - 1)
  const truncatedBase = baseName.slice(0, maxLength - ext.length - 4)
  return `${truncatedBase}...${ext}`
}

const openInNewTab = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const openLightbox = (preview: PreviewItem): void => {
  lightbox.isOpen = true
  lightbox.url = preview.previewUrl
  lightbox.fileName = preview.fileName
}

const closeLightbox = (): void => {
  lightbox.isOpen = false
  lightbox.url = ''
  lightbox.fileName = ''
}

const openDocumentPreview = async (preview: PreviewItem): Promise<void> => {
  const fileName = preview.fileName.toLowerCase()
  const isPdf = preview.fileType?.includes('pdf') || fileName.endsWith('.pdf')
  const isText = preview.fileType?.includes('text/plain') || fileName.endsWith('.txt')

  docPreview.isOpen = true
  docPreview.url = preview.previewUrl
  docPreview.fileName = preview.fileName
  docPreview.fileType = preview.fileType || ''
  docPreview.isPdf = isPdf
  docPreview.isText = isText
  docPreview.textContent = ''

  if (isText) {
    try {
      const res = await fetch(preview.previewUrl)
      docPreview.textContent = (await res.text()) || 'File is empty'
    } catch (error) {
      console.error('Error reading text file:', error)
      docPreview.textContent = 'Error reading file content'
    }
  }
}

const closeDocumentPreview = (): void => {
  docPreview.isOpen = false
  docPreview.url = ''
  docPreview.fileName = ''
  docPreview.fileType = ''
  docPreview.textContent = ''
  docPreview.isPdf = false
  docPreview.isText = false
}

// Close modals if preview is removed
watch(
  () => props.previews,
  (next) => {
    const urls = next.map((p) => p.previewUrl)
    if (lightbox.isOpen && !urls.includes(lightbox.url)) closeLightbox()
    if (docPreview.isOpen && !urls.includes(docPreview.url)) closeDocumentPreview()
  },
  { deep: true }
)
</script>
