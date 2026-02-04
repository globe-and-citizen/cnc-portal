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
        @click="openModal('image', preview)"
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
        @click="openModal('document', preview)"
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

    <!-- Image Lightbox Modal -->
    <Teleport to="body">
      <div
        v-if="modalState.type === 'image'"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-90 p-4"
        @click="closeModal"
        @keydown.esc="closeModal"
        data-test="upload-lightbox-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
      >
        <div
          class="relative bg-black rounded-lg max-w-4xl max-h-full flex flex-col items-center justify-center"
          @click.stop
        >
          <div class="absolute top-4 right-4 flex gap-2 z-20">
            <button
              class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80"
              @click="closeModal"
              data-test="upload-lightbox-close"
              aria-label="Close lightbox"
            >
              <Icon icon="heroicons:x-mark" class="w-6 h-6" />
            </button>
            <button
              class="btn btn-sm btn-ghost text-white bg-black bg-opacity-60 hover:bg-opacity-80"
              @click="downloadFile(modalState.url)"
              data-test="upload-lightbox-download"
              aria-label="Download image"
            >
              <Icon icon="heroicons:arrow-down-tray" class="w-5 h-5" />
            </button>
          </div>
          <h2 id="lightbox-title" class="sr-only">{{ modalState.fileName }}</h2>
          <img
            :src="modalState.url"
            :alt="modalState.fileName"
            class="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    </Teleport>

    <!-- Document Preview Modal -->
    <Teleport to="body">
      <div
        v-if="modalState.type === 'document'"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-black bg-opacity-80 p-4"
        @click="closeModal"
        @keydown.esc="closeModal"
        data-test="upload-doc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-title"
      >
        <div
          class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full h-[80vh] p-4 flex flex-col"
          @click.stop
        >
          <div class="flex justify-between items-center mb-3">
            <div
              id="doc-title"
              class="font-semibold text-gray-800 truncate"
              :title="modalState.fileName"
            >
              {{ modalState.fileName }}
            </div>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-ghost" @click="closeModal" data-test="upload-doc-close">
                Close
              </button>
              <button
                class="btn btn-sm btn-success"
                @click="downloadFile(modalState.url)"
                data-test="upload-doc-download"
              >
                Download
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-hidden rounded border border-gray-200 bg-gray-50">
            <!-- PDF Preview -->
            <iframe
              v-if="modalState.contentType === 'pdf'"
              :src="modalState.url"
              class="w-full h-full"
              title="Document preview"
            ></iframe>

            <!-- Text File Preview -->
            <pre
              v-else-if="modalState.contentType === 'text'"
              class="w-full h-full p-4 overflow-auto whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white"
              >{{ modalState.textContent }}</pre
            >

            <!-- Non-previewable files -->
            <div v-else class="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
              <Icon :icon="getFileIcon(modalState.fileName)" class="w-24 h-24 text-gray-400" />
              <div class="text-center">
                <div class="text-xl font-semibold text-gray-700 mb-2">
                  {{ modalState.fileName }}
                </div>
                <div class="text-sm text-gray-500 mb-4">
                  Type: {{ modalState.fileType || 'Unknown' }}
                </div>
                <p class="text-gray-600 mb-6">This file type cannot be previewed in the browser.</p>
                <button class="btn btn-success" @click="downloadFile(modalState.url)">
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
import { toRef } from 'vue'
import { getFileIcon, truncateFileName } from '@/utils/fileUtil'
import { useFilePreviewGallery } from '@/composables/useFilePreviewGallery'
import type { FilePreviewItem } from '@/types/file-preview'

// Props
const props = withDefaults(
  defineProps<{
    previews: FilePreviewItem[]
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

// Emits
const emit = defineEmits<{
  remove: [index: number]
}>()

// Use composable for gallery functionality
const { modalState, resolvedPreviews, openModal, closeModal, downloadFile } = useFilePreviewGallery(
  toRef(props, 'previews')
)
</script>
