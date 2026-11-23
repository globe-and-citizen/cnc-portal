import { ref, onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import { getPresignedUrl } from '@/composables/useFileUrl'
import type {
  FilePreviewItem,
  FilePreviewModalState,
  FilePreviewModalType,
  FilePreviewContentType
} from '@/types/file-preview'

type FileLocation = Pick<FilePreviewItem, 'key' | 'previewUrl'>

/** Rendering and selection state; URL validity belongs to getPresignedUrl. */
export function useFilePreviewGallery(
  previews: Ref<FilePreviewItem[]> | ComputedRef<FilePreviewItem[]>
) {
  const emptyModal = (): FilePreviewModalState => ({
    type: null,
    url: '',
    fileName: '',
    fileType: '',
    contentType: 'other',
    textContent: ''
  })
  const modalState = ref<FilePreviewModalState>(emptyModal())
  const resolvedPreviews = ref<FilePreviewItem[]>([])
  const error = ref<string | null>(null)
  let loadVersion = 0
  let openVersion = 0
  let disposed = false

  const sameFile = (first: FileLocation, second: FileLocation) =>
    first.key ? first.key === second.key : !second.key && first.previewUrl === second.previewUrl
  const contains = (preview: FileLocation) => previews.value.some((item) => sameFile(preview, item))
  const resolveUrl = (preview: FileLocation) =>
    preview.key ? getPresignedUrl(preview.key) : Promise.resolve(preview.previewUrl || null)

  const detectContentType = (preview: FilePreviewItem): FilePreviewContentType => {
    const fileName = preview.fileName.toLowerCase()
    const fileType = preview.fileType || ''
    if (fileType.includes('pdf') || fileName.endsWith('.pdf')) return 'pdf'
    if (fileType.includes('text/plain') || fileName.endsWith('.txt')) return 'text'
    return 'other'
  }

  const closeModal = (): void => {
    openVersion++
    modalState.value = emptyModal()
    document.body.style.overflow = ''
  }

  const openModal = async (type: FilePreviewModalType, preview: FilePreviewItem): Promise<void> => {
    closeModal()
    const version = openVersion
    error.value = null
    const url = await resolveUrl(preview)
    if (disposed || version !== openVersion || !contains(preview)) return
    if (!url) {
      error.value = 'Unable to load this file. Try opening it again.'
      return
    }
    const contentType = type === 'document' ? detectContentType(preview) : 'other'
    modalState.value = {
      type,
      key: preview.key,
      url,
      fileName: preview.fileName,
      fileType: preview.fileType || '',
      contentType,
      textContent: ''
    }
    document.body.style.overflow = 'hidden'

    if (contentType === 'text') {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error('File content unavailable')
        const text = await response.text()
        if (!disposed && version === openVersion)
          modalState.value.textContent = text || 'File is empty'
      } catch {
        if (!disposed && version === openVersion)
          modalState.value.textContent = 'Error reading file content'
      }
    }
  }

  const downloadFile = async (preview: FileLocation): Promise<void> => {
    error.value = null
    // Reserve the window while the click still has user activation.
    const popup = window.open('about:blank', '_blank')
    if (!popup) {
      error.value = 'Allow popups to download this file, then try again.'
      return
    }
    popup.opener = null
    const policy = popup.document.createElement('meta')
    policy.name = 'referrer'
    policy.content = 'no-referrer'
    popup.document.head.appendChild(policy)
    const url = await resolveUrl(preview)
    if (disposed || !contains(preview) || !url) {
      popup.close()
      if (!disposed && contains(preview))
        error.value = 'Unable to download this file. Try downloading it again.'
      return
    }
    if (!popup.closed) {
      const link = popup.document.createElement('a')
      link.href = url
      link.rel = 'noopener noreferrer'
      link.target = '_self'
      popup.document.body.appendChild(link)
      link.click()
    }
  }

  const loadPresignedUrls = async (): Promise<void> => {
    const version = ++loadVersion
    const snapshot = previews.value.map((preview) => ({ ...preview }))
    resolvedPreviews.value = snapshot.map((preview) => ({
      ...preview,
      previewUrl: preview.key ? '' : preview.previewUrl
    }))
    error.value = null
    const resolved = await Promise.all(
      snapshot.map(async (preview) => ({
        ...preview,
        previewUrl: (await resolveUrl(preview)) ?? ''
      }))
    )
    if (disposed || version !== loadVersion) return
    resolvedPreviews.value = resolved
    if (resolved.some((preview) => preview.key && !preview.previewUrl))
      error.value = 'Some files could not be loaded. Try again.'
  }

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') closeModal()
  }
  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => {
    disposed = true
    closeModal()
    window.removeEventListener('keydown', handleKeydown)
  })
  watch(
    () => previews.value,
    () => {
      // Cancel a pending opening too; identity, rather than the renewed URL, owns selection.
      if (!modalState.value.type) openVersion++
      else if (!contains({ key: modalState.value.key, previewUrl: modalState.value.url }))
        closeModal()
      void loadPresignedUrls()
    },
    { deep: true, immediate: true }
  )

  return {
    error,
    modalState,
    resolvedPreviews,
    openModal,
    closeModal,
    downloadFile,
    loadPresignedUrls
  }
}
