import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ProfileImageUpload from '../ProfileImageUpload.vue'
import { mockUploadFileApi } from '@/tests/mocks/api.mock'

describe('ProfileImageUpload.vue', () => {
  let wrapper: VueWrapper

  const SELECTORS = {
    uploadBox: '[data-test="profile-image-upload-box"]',
    fileInput: '[data-test="profile-image-input"]',
    errorMessage: '[data-test="profile-image-error"]'
  } as const

  const createMockFile = (name: string, type: string, size = 1024): File => {
    return new File([new Uint8Array(size)], name, { type })
  }

  const mountComponent = (props = {}) =>
    mount(ProfileImageUpload, {
      props,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  const triggerFileSelection = async (file: File) => {
    const input = wrapper.find(SELECTORS.fileInput)
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })
    await input.trigger('change')
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUploadFileApi.mockReset()
    mockUploadFileApi.mockResolvedValue({
      files: [{ fileUrl: 'https://storage.railway.app/test-image.jpg' }],
      count: 1
    })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Validation', () => {
    it('rejects non-image files', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('document.pdf', 'application/pdf'))

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(mockUploadFileApi).not.toHaveBeenCalled()
    })

    it('rejects files larger than 10MB', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('large.png', 'image/png', 11 * 1024 * 1024))

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(mockUploadFileApi).not.toHaveBeenCalled()
    })

    it('accepts image by extension fallback when MIME type is empty', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', ''))

      expect(mockUploadFileApi).toHaveBeenCalledOnce()
    })
  })

  describe('Upload', () => {
    it('uploads successfully and emits new model value', async () => {
      const expectedUrl = 'https://storage.railway.app/uploaded-image.png'
      mockUploadFileApi.mockResolvedValue({
        files: [{ fileUrl: expectedUrl }],
        count: 1
      })

      wrapper = mountComponent({ modelValue: '' })
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(mockUploadFileApi).toHaveBeenCalledOnce()
      expect(mockUploadFileApi).toHaveBeenCalledWith([expect.any(File)])

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[emitted.length - 1]).toEqual([expectedUrl])
    })

    it('handles API error response', async () => {
      mockUploadFileApi.mockRejectedValue(new Error('Upload failed'))

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
    })

    it('handles network Error objects', async () => {
      mockUploadFileApi.mockRejectedValue(new Error('Network error'))

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))
    })

    it('handles non-Error thrown values', async () => {
      mockUploadFileApi.mockRejectedValue('network exploded')

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))
    })

    it('handles missing fileUrl in backend response', async () => {
      mockUploadFileApi.mockResolvedValue({
        files: [],
        count: 0
      })

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))
    })
  })

  describe('UI states', () => {
    it('shows uploading state while request is pending', async () => {
      let resolveUpload: (value: unknown) => void = () => undefined
      const pendingPromise = new Promise((resolve) => {
        resolveUpload = resolve
      })
      mockUploadFileApi.mockReturnValue(pendingPromise)

      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      Object.defineProperty(input.element, 'files', {
        value: [createMockFile('avatar.png', 'image/png')],
        writable: false
      })
      input.trigger('change')
      await flushPromises()

      expect(wrapper.text()).toContain('Uploading...')

      resolveUpload({
        files: [{ fileUrl: 'https://test.com/image.png' }],
        count: 1
      })
      await flushPromises()
    })

    it('does not upload when no file is selected', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(input.element, 'files', {
        value: [],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(mockUploadFileApi).not.toHaveBeenCalled()
    })

    it('shows existing image style when model value is provided', () => {
      wrapper = mountComponent({ modelValue: 'https://storage.railway.app/existing.png' })

      expect(wrapper.find(SELECTORS.uploadBox).classes()).toContain('border-green-500')
    })
  })
})
