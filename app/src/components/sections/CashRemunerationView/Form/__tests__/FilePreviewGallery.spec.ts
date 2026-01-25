import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import FilePreviewGallery from '../FilePreviewGallery.vue'
import { getPresignedUrl } from '@/composables/useFileUrl'

vi.mock('@/composables/useFileUrl', () => ({
  getPresignedUrl: vi.fn()
}))

describe('FilePreviewGallery', () => {
  const IMAGE_PREVIEW = {
    previewUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    fileName: 'photo.jpg',
    fileSize: 1024,
    fileType: 'image/jpeg',
    isImage: true
  }

  const PDF_PREVIEW = {
    previewUrl: 'blob:http://localhost/pdf',
    fileName: 'document.pdf',
    fileSize: 2048,
    fileType: 'application/pdf',
    isImage: false
  }

  const TXT_PREVIEW = {
    previewUrl: 'blob:http://localhost/txt',
    fileName: 'notes.txt',
    fileSize: 512,
    fileType: 'text/plain',
    isImage: false
  }

  const S3_IMAGE_PREVIEW = {
    previewUrl: '',
    fileName: 'remote.jpg',
    fileSize: 1000,
    fileType: 'image/jpeg',
    isImage: true,
    key: 's3-key-123'
  }

  const MULTIPLE_PREVIEWS = [IMAGE_PREVIEW, PDF_PREVIEW, TXT_PREVIEW]

  const SELECTORS = {
    previewItem: '[data-test="preview-item"]',
    imagePreview: '[data-test="image-preview"]',
    documentPreview: '[data-test="document-preview"]',
    imageLoading: '[data-test="image-loading"]',
    removeButton: '[data-test="remove-button"]',
    lightboxModal: '[data-test="upload-lightbox-modal"]',
    lightboxClose: '[data-test="upload-lightbox-close"]',
    lightboxDownload: '[data-test="upload-lightbox-download"]',
    docModal: '[data-test="upload-doc-modal"]',
    docClose: '[data-test="upload-doc-close"]',
    docDownload: '[data-test="upload-doc-download"]'
  } as const

  let wrapper: VueWrapper<InstanceType<typeof FilePreviewGallery>>

  const createWrapper = (props = {}) => {
    return mount(FilePreviewGallery, {
      props: {
        previews: MULTIPLE_PREVIEWS,
        canRemove: true,
        ...props
      },
      global: {
        stubs: {
          Icon: true,
          Teleport: true
        }
      }
    })
  }

  const flushPromises = async () => {
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Remove Functionality', () => {
    it('should prevent event propagation when remove is clicked', async () => {
      wrapper = createWrapper({ previews: [IMAGE_PREVIEW] })

      const removeButton = wrapper.find(SELECTORS.removeButton)
      const clickSpy = vi.fn()

      wrapper.find(SELECTORS.previewItem).element.addEventListener('click', clickSpy)
      await removeButton.trigger('click')

      expect(clickSpy).not.toHaveBeenCalled()
    })
  })

  describe('S3 Presigned URLs', () => {
    it('should cache presigned URLs and not refetch', async () => {
      const mockUrl = 'https://cdn.example.com/image.jpg'
      ;(getPresignedUrl as unknown as Mock).mockResolvedValue(mockUrl)

      wrapper = createWrapper({ previews: [S3_IMAGE_PREVIEW] })
      await flushPromises()

      expect(getPresignedUrl).toHaveBeenCalledTimes(1)

      // Update props with same key
      await wrapper.setProps({ previews: [S3_IMAGE_PREVIEW, IMAGE_PREVIEW] })
      await flushPromises()

      // Should still be called only once (cached)
      expect(getPresignedUrl).toHaveBeenCalledTimes(1)
    })
  })

  describe('Image Lightbox Modal', () => {
    it('should display correct image in lightbox', async () => {
      wrapper = createWrapper()

      await wrapper.find(SELECTORS.imagePreview).trigger('click')

      const modal = wrapper.find(SELECTORS.lightboxModal)
      const img = modal.find('img')

      expect(img.attributes('src')).toBe(IMAGE_PREVIEW.previewUrl)
      expect(img.attributes('alt')).toBe(IMAGE_PREVIEW.fileName)
    })
  })

  describe('Document Preview Modal', () => {
    it('should close document modal when backdrop is clicked', async () => {
      wrapper = createWrapper({ previews: [PDF_PREVIEW] })

      await wrapper.find(SELECTORS.documentPreview).trigger('click')

      const modal = wrapper.find(SELECTORS.docModal)
      await modal.trigger('click')

      expect(wrapper.find(SELECTORS.docModal).exists()).toBe(false)
    })
  })

  describe('Content Type Detection', () => {
    it('should detect text content type correctly', async () => {
      wrapper = createWrapper({ previews: [TXT_PREVIEW] })

      await wrapper.find(SELECTORS.documentPreview).trigger('click')
      await nextTick()

      expect(wrapper.find(SELECTORS.docModal).exists()).toBe(true)
    })

    it('should detect other file types correctly', async () => {
      const otherPreview = {
        previewUrl: 'blob:http://localhost/file',
        fileName: 'archive.zip',
        fileSize: 5000,
        fileType: 'application/zip',
        isImage: false
      }
      wrapper = createWrapper({ previews: [otherPreview] })

      await wrapper.find(SELECTORS.documentPreview).trigger('click')
      await nextTick()

      expect(wrapper.find(SELECTORS.docModal).exists()).toBe(true)
    })
  })

  describe('Download Functionality', () => {
    it('should download file when download button is clicked in lightbox', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      wrapper = createWrapper({ previews: [IMAGE_PREVIEW] })

      await wrapper.find(SELECTORS.imagePreview).trigger('click')
      await nextTick()

      await wrapper.find(SELECTORS.lightboxDownload).trigger('click')

      expect(windowOpenSpy).toHaveBeenCalledWith(
        IMAGE_PREVIEW.previewUrl,
        '_blank',
        'noopener,noreferrer'
      )

      windowOpenSpy.mockRestore()
    })

    it('should download file when download button is clicked in document modal', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      wrapper = createWrapper({ previews: [PDF_PREVIEW] })

      await wrapper.find(SELECTORS.documentPreview).trigger('click')
      await nextTick()

      await wrapper.find(SELECTORS.docDownload).trigger('click')

      expect(windowOpenSpy).toHaveBeenCalledWith(
        PDF_PREVIEW.previewUrl,
        '_blank',
        'noopener,noreferrer'
      )

      windowOpenSpy.mockRestore()
    })
  })

  describe('Modal Auto-close on Preview Removal', () => {
    it('should auto-close modal when preview is removed', async () => {
      wrapper = createWrapper({ previews: [IMAGE_PREVIEW, PDF_PREVIEW] })

      await wrapper.find(SELECTORS.imagePreview).trigger('click')
      await nextTick()

      expect(wrapper.find(SELECTORS.lightboxModal).exists()).toBe(true)

      // Remove the previewed image
      await wrapper.setProps({ previews: [PDF_PREVIEW] })
      await nextTick()

      expect(wrapper.find(SELECTORS.lightboxModal).exists()).toBe(false)
    })
  })
})
