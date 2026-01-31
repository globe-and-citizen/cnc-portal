<template>
  <div
    v-if="resolvedPreviews.length"
    class="relative inline-flex items-center"
    @mouseenter="isExpanded = true"
    @mouseleave="isExpanded = false"
  >
    <!-- Vue réduite -->
    <div v-show="!isExpanded" class="flex items-center -space-x-3">
      <div
        v-for="(preview, i) in displayedPreviews"
        :key="preview.key || i"
        class="relative rounded-full border-2 border-emerald-500 shadow-xl overflow-hidden bg-gray-100 w-14 h-14"
        :style="{ zIndex: displayedPreviews.length - i }"
      >
        <img
          v-if="preview.isImage && preview.previewUrl"
          :src="preview.previewUrl"
          :alt="preview.fileName"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center bg-gray-200">
          <Icon :icon="getFileIcon(preview.fileName)" class="w-4 h-4 text-gray-500" />
        </div>
      </div>

      <div
        v-if="remainingCount"
        class="relative flex items-center justify-center rounded-full border-2 border-emerald-500 shadow-sm bg-gray-700 text-white text-xs font-semibold w-14 h-14"
      >
        +{{ remainingCount }}
      </div>
    </div>

    <!-- Vue étendue -->
    <div
      v-show="isExpanded"
      class="grid grid-cols-5 gap-2 p-2 bg-transparent rounded-lg shadow-lg border border-gray-200"
    >
      <button
        v-for="(preview, i) in resolvedPreviews"
        :key="preview.key || i"
        type="button"
        class="relative rounded-md overflow-hidden hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-gray-200 hover:border-emerald-500 w-16 h-16"
        @click="openPreview(i)"
      >
        <img
          v-if="preview.isImage && preview.previewUrl"
          :src="preview.previewUrl"
          :alt="preview.fileName"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-100 p-1">
          <Icon :icon="getFileIcon(preview.fileName)" class="w-5 h-5 text-gray-600" />
          <span class="text-[8px] text-gray-500 truncate w-full text-center mt-0.5">
            {{ truncateFileName(preview.fileName, 8) }}
          </span>
        </div>
        <div
          class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center"
        >
          <Icon
            icon="heroicons:magnifying-glass-plus"
            class="w-4 h-4 text-white opacity-0 hover:opacity-100"
          />
        </div>
      </button>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="modal.isOpen"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-90 p-4"
        @click="closeModal"
        @keydown.esc="closeModal"
      >
        <div
          class="relative bg-black rounded-lg max-w-4xl max-h-full flex flex-col items-center justify-center"
          @click.stop
        >
          <!-- Contrôles -->
          <div class="absolute top-4 right-4 flex gap-2 z-20">
            <button
              class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80"
              @click="closeModal"
            >
              <Icon icon="heroicons:x-mark" class="w-6 h-6" />
            </button>
            <button
              class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80"
              @click="downloadFile"
            >
              <Icon icon="heroicons:arrow-down-tray" class="w-5 h-5" />
            </button>
          </div>

          <!-- Contenu -->
          <template v-if="current">
            <img
              v-if="current.isImage"
              :src="current.previewUrl"
              :alt="current.fileName"
              class="max-w-full max-h-[80vh] object-contain"
            />

            <div
              v-else-if="isViewable(current.fileName)"
              class="bg-white rounded-2xl shadow-xl border border-gray-200 w-[768px] h-[1024px] max-w-[90vw] max-h-[90vh] overflow-hidden"
            >
              <iframe :src="current.previewUrl" class="w-full h-full" />
            </div>

            <div
              v-else-if="isCompressed(current.fileName)"
              class="bg-white rounded-2xl p-12 flex flex-col items-center justify-center gap-6 min-w-[500px] min-h-[400px]"
            >
              <Icon icon="mdi:folder-zip" class="w-40 h-40 text-amber-500" />
              <p class="text-base text-gray-500">Compressed file - Download required</p>
            </div>

            <div
              v-else
              class="bg-white rounded-2xl p-12 flex flex-col items-center justify-center gap-6 min-w-[500px] min-h-[400px]"
            >
              <Icon :icon="getFileIcon(current.fileName)" class="w-40 h-40 text-gray-400" />
              <p class="text-base text-gray-500">Download required for this file type</p>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ref, computed, toRef } from 'vue'
import { getFileIcon, truncateFileName, getFileExtension } from '@/utils/fileUtil'
import { useFilePreviewGallery } from '@/composables/useFilePreviewGallery'
import type { FilePreviewItem } from '@/types/file-preview'

const COMPRESSED = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz']
const VIEWABLE = ['pdf', 'txt', 'doc', 'docx', 'csv', 'json', 'xml', 'html', 'htm']

const isViewable = (name: string) => VIEWABLE.includes(getFileExtension(name))
const isCompressed = (name: string) => COMPRESSED.includes(getFileExtension(name))

const props = defineProps<{
  previews: FilePreviewItem[]
}>()

// Use the shared composable for presigned URL caching and modal management
const { resolvedPreviews, downloadFile: downloadCurrentFile } = useFilePreviewGallery(
  toRef(props, 'previews')
)

const isExpanded = ref(false)
const modal = ref({ isOpen: false, index: 0 })
const MAX_VISIBLE = 4

const displayedPreviews = computed(() => resolvedPreviews.value.slice(0, MAX_VISIBLE))
const remainingCount = computed(() => Math.max(0, resolvedPreviews.value.length - MAX_VISIBLE))
const current = computed(
  (): FilePreviewItem | null => resolvedPreviews.value[modal.value.index] ?? null
)

const openPreview = (index: number) => {
  modal.value = { isOpen: true, index }
  document.body.style.overflow = 'hidden'
}

const closeModal = () => {
  modal.value = { isOpen: false, index: 0 }
  document.body.style.overflow = ''
}

const downloadFile = () => {
  if (current.value?.previewUrl) {
    downloadCurrentFile(current.value.previewUrl)
  }
}
</script>
