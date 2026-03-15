import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ProfileImageUpload from '../ProfileImageUpload.vue'

const mockFetch = (globalThis as { __mockFetch?: ReturnType<typeof vi.fn> }).__mockFetch
const originalFetch = globalThis.fetch

type ToastStoreMock = {
  addErrorToast: ReturnType<typeof vi.fn>
  addSuccessToast: ReturnType<typeof vi.fn>
  addInfoToast: ReturnType<typeof vi.fn>
  toasts: unknown[]
}

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

  const getToastStore = (): ToastStoreMock => {
    return (globalThis as { __mockToastStore?: ToastStoreMock }).__mockToastStore as ToastStoreMock
  }

  beforeEach(() => {
    vi.clearAllMocks()

    if (!mockFetch) {
      throw new Error('Global __mockFetch is not initialized in test setup')
    }

    ;(globalThis as { __mockUseStorageValue?: string }).__mockUseStorageValue = 'mock-auth-token'

    const toastStore = getToastStore()
    toastStore.addErrorToast.mockReset()
    toastStore.addSuccessToast.mockReset()
    toastStore.addInfoToast.mockReset()

    globalThis.fetch = mockFetch as unknown as typeof fetch
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ files: [{ fileUrl: 'https://storage.railway.app/test-image.jpg' }] })
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    ;(globalThis as { __mockUseStorageValue?: string }).__mockUseStorageValue = undefined

    if (wrapper) wrapper.unmount()
  })

  describe('Validation', () => {
    it('rejects non-image files', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('document.pdf', 'application/pdf'))

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(getToastStore().addErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('Only images')
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects files larger than 10MB', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('large.png', 'image/png', 11 * 1024 * 1024))

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(getToastStore().addErrorToast).toHaveBeenCalledWith(expect.stringContaining('10 MB'))
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('accepts image by extension fallback when MIME type is empty', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', ''))

      expect(mockFetch).toHaveBeenCalledOnce()
    })
  })

  describe('Upload', () => {
    it('uploads successfully and emits new model value', async () => {
      const expectedUrl = 'https://storage.railway.app/uploaded-image.png'
      mockFetch?.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [{ fileUrl: expectedUrl }] })
      })

      wrapper = mountComponent({ modelValue: '' })
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer mock-auth-token' }),
          body: expect.any(FormData)
        })
      )

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[emitted.length - 1]).toEqual([expectedUrl])
      expect(getToastStore().addSuccessToast).toHaveBeenCalledWith('Image uploaded')
    })

    it('sends empty headers when auth token is missing', async () => {
      ;(globalThis as { __mockUseStorageValue?: string }).__mockUseStorageValue = ''

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {}
        })
      )
    })

    it('handles API error response', async () => {
      mockFetch?.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' })
      })

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(getToastStore().addErrorToast).toHaveBeenCalledWith('Upload failed')
    })

    it('handles invalid JSON response body', async () => {
      mockFetch?.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(getToastStore().addErrorToast).toHaveBeenCalledWith('Upload response missing fileUrl')
    })

    it('handles network Error objects', async () => {
      mockFetch?.mockRejectedValue(new Error('Network error'))

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(getToastStore().addErrorToast).toHaveBeenCalledWith('Network error')
    })

    it('handles non-Error thrown values', async () => {
      mockFetch?.mockRejectedValue('network exploded')

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(getToastStore().addErrorToast).toHaveBeenCalledWith('Failed to upload image')
    })

    it('handles missing fileUrl in backend response', async () => {
      mockFetch?.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [] })
      })

      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(getToastStore().addErrorToast).toHaveBeenCalledWith('Upload response missing fileUrl')
    })
  })

  describe('UI states', () => {
    it('shows uploading state while request is pending', async () => {
      let resolveUpload: (value: unknown) => void = () => undefined
      const pendingPromise = new Promise((resolve) => {
        resolveUpload = resolve
      })
      mockFetch?.mockReturnValue(pendingPromise)

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
        ok: true,
        json: () => Promise.resolve({ files: [{ fileUrl: 'https://test.com/image.png' }] })
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

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('shows existing image style when model value is provided', () => {
      wrapper = mountComponent({ modelValue: 'https://storage.railway.app/existing.png' })

      expect(wrapper.find(SELECTORS.uploadBox).classes()).toContain('border-green-500')
    })
  })
})
