<template>
  <div
    v-if="resolvedPreviews.length"
    class="relative inline-flex items-center"
    @mouseenter="isExpanded = true"
    @mouseleave="isExpanded = false"
  >
    <!-- Vue réduite -->
    <div v-show="!isExpanded" class="flex -space-x-6 rtl:space-x-reverse" data-test="avatar-stack">
      <div
        v-for="(preview, i) in displayedPreviews"
        :key="preview.key || i"
        class="relative inline-flex h-12 w-12 overflow-hidden rounded-full ring-2 ring-white dark:ring-gray-900"
        data-test="avatar-item"
      >
        <img
          v-if="preview.isImage && preview.previewUrl"
          :src="preview.previewUrl"
          :alt="preview.fileName"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full w-full items-center justify-center bg-emerald-100">
          <Icon :icon="getFileIcon(preview.fileName)" class="h-4 w-4 text-gray-500" />
        </div>
      </div>

      <div
        v-if="remainingCount"
        class="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-white ring-2 ring-white dark:ring-gray-900"
        data-test="avatar-remaining"
      >
        <span>+{{ remainingCount }}</span>
      </div>
    </div>

    <!-- Vue étendue -->
    <div
      v-show="isExpanded"
      class="grid grid-cols-5 gap-2 rounded-lg border border-gray-200 bg-transparent p-2 shadow-lg"
    >
      <button
        v-for="(preview, i) in resolvedPreviews"
        :key="preview.key || i"
        type="button"
        class="group relative h-16 w-16 overflow-hidden rounded-md border border-gray-200 hover:scale-105 hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
        @click="openPreview(i)"
      >
        <img
          v-if="preview.isImage && preview.previewUrl"
          :src="preview.previewUrl"
          :alt="preview.fileName"
          class="h-full w-full object-cover"
        />
        <div v-else class="flex h-full w-full flex-col items-center justify-center bg-gray-100 p-1">
          <Icon :icon="getFileIcon(preview.fileName)" class="h-5 w-5 text-gray-600" />
          <span class="mt-0.5 w-full truncate text-center text-[8px] text-gray-500">
            {{ truncateFileName(preview.fileName, 8) }}
          </span>
        </div>
        <div
          class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10"
        >
          <Icon
            icon="heroicons:magnifying-glass-plus"
            class="h-4 w-4 text-white opacity-0 group-hover:opacity-100"
          />
        </div>
      </button>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="modal.isOpen"
        class="bg-opacity-90 fixed inset-0 z-999 flex items-center justify-center bg-black p-4"
        @click="closeModal"
        @keydown.esc="closeModal"
      >
        <div
          class="relative flex max-h-full max-w-4xl flex-col items-center justify-center rounded-lg bg-black"
          @click.stop
        >
          <!-- Contrôles -->
          <div class="absolute top-4 right-4 z-20 flex gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              class="bg-opacity-60 hover:bg-opacity-80 bg-black text-white"
              icon="heroicons:x-mark"
              @click="closeModal"
            />
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              class="bg-opacity-60 hover:bg-opacity-80 bg-black text-white"
              icon="heroicons:arrow-down-tray"
              @click="downloadFile"
            />
          </div>

          <!-- Contenu -->
          <template v-if="current">
            <img
              v-if="current.isImage"
              :src="current.previewUrl"
              :alt="current.fileName"
              class="max-h-[80vh] max-w-full object-contain"
            />

            <div
              v-else-if="isViewable(current.fileName)"
              class="h-256 max-h-[90vh] w-3xl max-w-[90vw] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
            >
              <iframe :src="current.previewUrl" class="h-full w-full" />
            </div>

            <div
              v-else-if="isCompressed(current.fileName)"
              class="flex min-h-100 min-w-125 flex-col items-center justify-center gap-6 rounded-2xl bg-white p-12"
            >
              <Icon icon="mdi:folder-zip" class="h-40 w-40 text-amber-500" />
              <p class="text-base text-gray-500">Compressed file - Download required</p>
            </div>

            <div
              v-else
              class="flex min-h-100 min-w-125 flex-col items-center justify-center gap-6 rounded-2xl bg-white p-12"
            >
              <Icon :icon="getFileIcon(current.fileName)" class="h-40 w-40 text-gray-400" />
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
