<template>
  <div v-if="resolvedPreviews.length > 0" class="mt-2" :class="gridClass">
    <div
      v-for="(preview, index) in resolvedPreviews"
      :key="preview.previewUrl || preview.key || index"
      class="group relative"
      data-test="preview-item"
    >
      <!-- Image preview -->
      <button
        v-if="preview.isImage && preview.previewUrl"
        type="button"
        :class="[
          'group relative w-full overflow-hidden rounded-md border border-gray-200 bg-gray-100 transition-all hover:border-emerald-500 focus:outline-hidden',
          itemHeightClass,
          imageClass
        ]"
        @click="openModal('image', preview)"
        data-test="image-preview"
      >
        <img :src="preview.previewUrl" class="h-full w-full object-cover" :alt="preview.fileName" />
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/5"
        >
          <Icon
            icon="heroicons:magnifying-glass-plus"
            class="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </button>

      <!-- Loading state for S3 images -->
      <div
        v-else-if="preview.isImage && !preview.previewUrl && preview.key"
        :class="[
          'flex w-full flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-100',
          itemHeightClass
        ]"
        data-test="image-loading"
      >
        <span class="loading loading-spinner loading-sm text-gray-400"></span>
        <span class="mt-1 text-[10px] text-gray-500">Loading...</span>
      </div>

      <!-- Document preview -->
      <button
        v-else
        type="button"
        :class="[
          'flex w-full flex-col items-center justify-center overflow-hidden rounded-md border border-gray-200 p-2 transition-colors hover:border-emerald-500',
          itemHeightClass,
          documentClass
        ]"
        data-test="document-preview"
        @click="openModal('document', preview)"
      >
        <Icon :icon="getFileIcon(preview.fileName)" class="h-6 w-6 text-gray-600" />
        <span
          class="mt-1 w-full truncate text-center text-[11px] text-gray-700"
          :title="preview.fileName"
        >
          {{ truncateFileName(preview.fileName) }}
        </span>
      </button>

      <!-- Remove button -->
      <button
        v-if="canRemove"
        class="bg-error absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white opacity-0 shadow-xs transition-all group-hover:opacity-100 hover:shadow-sm"
        @click.stop="emit('remove', index)"
        data-test="remove-button"
        aria-label="Remove file"
      >
        <Icon icon="heroicons:x-mark" class="h-3 w-3" />
      </button>
    </div>

    <!-- Image Lightbox Modal -->
    <Teleport to="body">
      <div
        v-if="modalState.type === 'image'"
        class="bg-opacity-90 fixed inset-0 z-999 flex items-center justify-center bg-black p-4"
        @click="closeModal"
        @keydown.esc="closeModal"
        data-test="upload-lightbox-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lightbox-title"
      >
        <div
          class="relative flex max-h-full max-w-4xl flex-col items-center justify-center rounded-lg bg-black"
          @click.stop
        >
          <div class="absolute top-4 right-4 z-20 flex gap-2">
            <button
              class="btn btn-sm btn-ghost bg-opacity-60 hover:bg-opacity-80 bg-black text-white"
              @click="closeModal"
              data-test="upload-lightbox-close"
              aria-label="Close lightbox"
            >
              <Icon icon="heroicons:x-mark" class="h-6 w-6" />
            </button>
            <button
              class="btn btn-sm btn-ghost bg-opacity-60 hover:bg-opacity-80 bg-black text-white"
              @click="downloadFile(modalState.url)"
              data-test="upload-lightbox-download"
              aria-label="Download image"
            >
              <Icon icon="heroicons:arrow-down-tray" class="h-5 w-5" />
            </button>
          </div>
          <h2 id="lightbox-title" class="sr-only">{{ modalState.fileName }}</h2>
          <img
            :src="modalState.url"
            :alt="modalState.fileName"
            class="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
    </Teleport>

    <!-- Document Preview Modal -->
    <Teleport to="body">
      <div
        v-if="modalState.type === 'document'"
        class="bg-opacity-80 fixed inset-0 z-999 flex items-center justify-center bg-black p-4"
        @click="closeModal"
        @keydown.esc="closeModal"
        data-test="upload-doc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-title"
      >
        <div
          class="relative flex h-[80vh] w-full max-w-4xl flex-col rounded-lg bg-white p-4 shadow-xl"
          @click.stop
        >
          <div class="mb-3 flex items-center justify-between">
            <div
              id="doc-title"
              class="truncate font-semibold text-gray-800"
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

          <div class="flex-1 overflow-hidden rounded-sm border border-gray-200 bg-gray-50">
            <!-- PDF Preview -->
            <iframe
              v-if="modalState.contentType === 'pdf'"
              :src="modalState.url"
              class="h-full w-full"
              title="Document preview"
            ></iframe>

            <!-- Text File Preview -->
            <pre
              v-else-if="modalState.contentType === 'text'"
              class="h-full w-full overflow-auto bg-white p-4 font-mono text-sm whitespace-pre-wrap text-gray-800"
              >{{ modalState.textContent }}</pre
            >

            <!-- Non-previewable files -->
            <div v-else class="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
              <Icon :icon="getFileIcon(modalState.fileName)" class="h-24 w-24 text-gray-400" />
              <div class="text-center">
                <div class="mb-2 text-xl font-semibold text-gray-700">
                  {{ modalState.fileName }}
                </div>
                <div class="mb-4 text-sm text-gray-500">
                  Type: {{ modalState.fileType || 'Unknown' }}
                </div>
                <p class="mb-6 text-gray-600">This file type cannot be previewed in the browser.</p>
                <button class="btn btn-success" @click="downloadFile(modalState.url)">
                  <Icon icon="heroicons:arrow-down-tray" class="mr-2 h-5 w-5" />
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
