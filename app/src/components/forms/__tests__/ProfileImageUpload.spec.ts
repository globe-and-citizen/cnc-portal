import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import ProfileImageUpload from '../ProfileImageUpload.vue'

// Hoisted mocks
const { mockFetch, mockToastStore } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockToastStore: {
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }
}))

// Mock stores
vi.mock('@/stores', () => ({
  useToastStore: vi.fn(() => mockToastStore)
}))

// Mock @vueuse/core for useStorage
vi.mock('@vueuse/core', () => ({
  useStorage: vi.fn(() => {
    const ref = { value: 'mock-auth-token' }
    return ref
  })
}))

// Mock fetch globally
const originalFetch = global.fetch

describe('ProfileImageUpload.vue', () => {
  let wrapper: VueWrapper

  const SELECTORS = {
    uploadBox: '[data-test="profile-image-upload-box"]',
    fileInput: '[data-test="profile-image-input"]',
    errorMessage: '[data-test="profile-image-error"]'
  } as const

  // Helper to create valid image file
  const createMockFile = (name: string, type: string, size: number = 1024): File => {
    const content = new Array(size).fill('a').join('')
    return new File([content], name, { type })
  }

  // Helper to mount component
  const mountComponent = (props = {}) => {
    return mount(ProfileImageUpload, {
      props,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ imageUrl: 'https://storage.railway.app/test-image.jpg' })
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    if (wrapper) wrapper.unmount()
  })

  describe('File Validation', () => {
    it('should reject non-image files', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const pdfFile = createMockFile('document.pdf', 'application/pdf')

      // Simulate file selection
      Object.defineProperty(input.element, 'files', {
        value: [pdfFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('Only images')
      )
    })

    it('should reject files exceeding 10MB', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      // Create a file larger than 10MB
      const largeFile = createMockFile('large.png', 'image/png', 11 * 1024 * 1024)

      Object.defineProperty(input.element, 'files', {
        value: [largeFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(expect.stringContaining('10 MB'))
    })

    it('should accept valid PNG files', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const pngFile = createMockFile('test.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [pngFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should accept valid JPEG files', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const jpegFile = createMockFile('photo.jpg', 'image/jpeg')

      Object.defineProperty(input.element, 'files', {
        value: [jpegFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should accept WebP files', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const webpFile = createMockFile('image.webp', 'image/webp')

      Object.defineProperty(input.element, 'files', {
        value: [webpFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('File Upload', () => {
    it('should upload file successfully', async () => {
      const expectedUrl = 'https://storage.railway.app/uploaded-image.png'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ imageUrl: expectedUrl })
      })

      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const imageFile = createMockFile('avatar.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [imageFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      )
      expect(mockToastStore.addSuccessToast).toHaveBeenCalledWith('Image uploaded')
    })

    it('should send authorization header when auth token exists', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const imageFile = createMockFile('avatar.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [imageFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-auth-token'
          })
        })
      )
    })

    it('should handle upload failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' })
      })

      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const imageFile = createMockFile('avatar.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [imageFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(mockToastStore.addErrorToast).toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const imageFile = createMockFile('avatar.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [imageFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Network error')
    })

    it('should handle missing imageUrl in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}) // No imageUrl
      })

      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const imageFile = createMockFile('avatar.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [imageFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Upload response missing imageUrl')
    })
  })

  describe('Loading State', () => {
    it('should disable input during upload', async () => {
      // Create a pending promise to simulate ongoing upload
      let resolveUpload: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolveUpload = resolve
      })

      mockFetch.mockReturnValue(pendingPromise)

      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const imageFile = createMockFile('avatar.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [imageFile],
        writable: false
      })
      input.trigger('change')
      await flushPromises()

      // Check loading state
      expect(wrapper.text()).toContain('Uploading...')

      // Resolve the upload
      resolveUpload!({
        ok: true,
        json: () => Promise.resolve({ imageUrl: 'https://test.com/image.png' })
      })
      await flushPromises()
    })
  })

  describe('Model Value (v-model)', () => {
    it('should update model value on successful upload', async () => {
      const expectedUrl = 'https://storage.railway.app/new-image.png'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ imageUrl: expectedUrl })
      })

      wrapper = mountComponent({ modelValue: '' })
      const input = wrapper.find(SELECTORS.fileInput)
      const imageFile = createMockFile('avatar.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [imageFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      // Check that update:modelValue was emitted
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![emitted!.length - 1]).toEqual([expectedUrl])
    })

    it('should display existing image when modelValue is provided', async () => {
      const existingUrl = 'https://storage.railway.app/existing.png'
      wrapper = mountComponent({ modelValue: existingUrl })

      // Should not show "Upload image" text when image exists
      // The component shows a background image instead
      const uploadBox = wrapper.find(SELECTORS.uploadBox)
      expect(uploadBox.classes()).toContain('border-green-500')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty file selection', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(input.element, 'files', {
        value: [],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      // Should not call fetch if no file selected
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should clear input value after upload attempt', async () => {
      wrapper = mountComponent()
      const input = wrapper.find(SELECTORS.fileInput)
      const imageFile = createMockFile('avatar.png', 'image/png')

      Object.defineProperty(input.element, 'files', {
        value: [imageFile],
        writable: false
      })
      await input.trigger('change')
      await flushPromises()

      // Input value should be cleared
      expect((input.element as HTMLInputElement).value).toBe('')
    })
  })
})
