import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { mount } from '@vue/test-utils'
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

  const PREVIEWS = [IMAGE_PREVIEW, PDF_PREVIEW, TXT_PREVIEW]

  const S = {
    previewItem: '[data-test="preview-item"]',
    imagePreview: '[data-test="image-preview"]',
    documentPreview: '[data-test="document-preview"]',
    imageLoading: '[data-test="image-loading"]',
    removeButton: '[data-test="remove-button"]',
    imageModal: '[data-test="upload-lightbox-modal"]',
    docModal: '[data-test="upload-doc-modal"]'
  } as const

  let wrapper: ReturnType<typeof mount<typeof FilePreviewGallery>>

  const flushAsync = async () => {
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()
  }

  const mountComponent = (props = {}) =>
    mount(FilePreviewGallery, {
      props: {
        previews: PREVIEWS,
        ...props
      },
      global: {
        stubs: {
          Icon: true,
          Teleport: true
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Remove button', () => {
    it('emits remove event with correct index', async () => {
      wrapper = mountComponent()

      const removeButtons = wrapper.findAll(S.removeButton)
      expect(removeButtons.length).toBeGreaterThan(1)

      await removeButtons[1]!.trigger('click')
      expect(wrapper.emitted('remove')).toEqual([[1]])
    })
  })

  describe('Presigned URLs', () => {
    const S3_IMAGE = {
      previewUrl: '',
      fileName: 'remote.jpg',
      fileSize: 1000,
      fileType: 'image/jpeg',
      isImage: true,
      key: 's3-key'
    }

    it('shows loading then renders resolved S3 image', async () => {
      ;(getPresignedUrl as unknown as Mock).mockResolvedValueOnce('https://cdn/img.jpg')

      wrapper = mountComponent({ previews: [S3_IMAGE] })

      expect(wrapper.find(S.imageLoading).exists()).toBe(true)

      await flushAsync()

      const image = wrapper.find(S.imagePreview)
      expect(image.exists()).toBe(true)
      expect(image.find('img').attributes('src')).toBe('https://cdn/img.jpg')
    })
  })

  describe('Watcher behavior', () => {
    it('closes image lightbox if image is removed', async () => {
      wrapper = mountComponent({ previews: [IMAGE_PREVIEW] })

      await wrapper.get(S.imagePreview).trigger('click')
      expect(wrapper.find(S.imageModal).exists()).toBe(true)

      await wrapper.setProps({ previews: [] })
      expect(wrapper.find(S.imageModal).exists()).toBe(false)
    })

    it('closes document modal if document is removed', async () => {
      wrapper = mountComponent({ previews: [PDF_PREVIEW] })

      await wrapper.get(S.documentPreview).trigger('click')
      expect(wrapper.find(S.docModal).exists()).toBe(true)

      await wrapper.setProps({ previews: [] })
      expect(wrapper.find(S.docModal).exists()).toBe(false)
    })

    it('keeps modal open if preview still exists', async () => {
      wrapper = mountComponent({ previews: [IMAGE_PREVIEW, PDF_PREVIEW] })

      await wrapper.get(S.imagePreview).trigger('click')
      await wrapper.setProps({ previews: [IMAGE_PREVIEW] })

      expect(wrapper.find(S.imageModal).exists()).toBe(true)
    })
  })
})
