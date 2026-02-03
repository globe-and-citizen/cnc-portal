import { ref, computed, onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import { getPresignedUrl } from '@/composables/useFileUrl'
import type {
  FilePreviewItem,
  FilePreviewModalState,
  FilePreviewModalType,
  FilePreviewContentType
} from '@/types/file-preview'

/**
 * Composable for managing file preview gallery state and functionality
 */
export function useFilePreviewGallery(
  previews: Ref<FilePreviewItem[]> | ComputedRef<FilePreviewItem[]>
) {
  // URL Cache for presigned URLs
  const urlCache = ref(new Map<string, string>())

  // Modal state
  const modalState = ref<FilePreviewModalState>({
    type: null,
    url: '',
    fileName: '',
    fileType: '',
    contentType: 'other',
    textContent: ''
  })

  // Resolved previews with cached URLs
  const resolvedPreviews = computed(() => {
    return previews.value.map((preview) => {
      if (preview.key && !preview.previewUrl) {
        const cachedUrl = urlCache.value.get(preview.key)
        return cachedUrl ? { ...preview, previewUrl: cachedUrl } : preview
      }
      return preview
    })
  })

  // Content type detection
  const detectContentType = (preview: FilePreviewItem): FilePreviewContentType => {
    const fileName = preview.fileName.toLowerCase()
    const fileType = preview.fileType || ''
    if (fileType.includes('pdf') || fileName.endsWith('.pdf')) return 'pdf'
    if (fileType.includes('text/plain') || fileName.endsWith('.txt')) return 'text'
    return 'other'
  }

  // Download file
  const downloadFile = (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Open modal
  const openModal = async (type: FilePreviewModalType, preview: FilePreviewItem): Promise<void> => {
    const contentType = type === 'document' ? detectContentType(preview) : 'other'

    modalState.value = {
      type,
      url: preview.previewUrl,
      fileName: preview.fileName,
      fileType: preview.fileType || '',
      contentType,
      textContent: ''
    }

    if (contentType === 'text') {
      try {
        const response = await fetch(preview.previewUrl)
        modalState.value.textContent = (await response.text()) || 'File is empty'
      } catch (error) {
        console.error('Error reading text file:', error)
        modalState.value.textContent = 'Error reading file content'
      }
    }

    document.body.style.overflow = 'hidden'
  }

  // Close modal
  const closeModal = (): void => {
    modalState.value = {
      type: null,
      url: '',
      fileName: '',
      fileType: '',
      contentType: 'other',
      textContent: ''
    }
    document.body.style.overflow = ''
  }

  // Load presigned URLs
  const loadPresignedUrls = async (): Promise<void> => {
    const keysToFetch = previews.value
      .filter((p) => p.key && !p.previewUrl && !urlCache.value.has(p.key))
      .map((p) => p.key!)

    if (keysToFetch.length === 0) return

    const results = await Promise.allSettled(
      keysToFetch.map(async (key) => ({ key, url: await getPresignedUrl(key) }))
    )

    const newCache = new Map(urlCache.value)
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.url) {
        newCache.set(result.value.key, result.value.url)
      }
    }
    urlCache.value = newCache
  }

  // Auto-close modal if preview removed
  const handlePreviewChange = (): void => {
    if (!modalState.value.type) return
    if (!previews.value.some((p) => p.previewUrl === modalState.value.url)) {
      closeModal()
    }
  }

  // Keyboard handling
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && modalState.value.type) closeModal()
  }

  // Lifecycle
  onMounted(() => {
    loadPresignedUrls()
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  })

  watch(() => previews.value, loadPresignedUrls, { deep: true })
  watch(() => previews.value, handlePreviewChange, { deep: true })

  return {
    urlCache,
    modalState,
    resolvedPreviews,
    openModal,
    closeModal,
    downloadFile,
    loadPresignedUrls
  }
}
