import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import MultiFileUpload from '../MultiFileUpload.vue'
import ButtonUI from '@/components/ButtonUI.vue'

/** Mock data **/
const MOCK_IMAGE_URL = 'https://storage.railway.app/bucket/path/image.png'

/** Hoisted mocks **/
const { mockFetch, mockToastStore } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockToastStore: {
    addErrorToast: vi.fn(),
    addSuccessToast: vi.fn()
  }
}))

// Mock global fetch
global.fetch = mockFetch

// Mock stores
vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn(() => mockToastStore)
}))

// Mock useStorage
vi.mock('@vueuse/core', () => ({
  useStorage: vi.fn(() => ({
    value: 'mock-auth-token'
  }))
}))

// Mock constants
vi.mock('@/constant/index', () => ({
  BACKEND_URL: 'http://localhost:3000'
}))

describe('MultiFileUpload', () => {
  let wrapper: ReturnType<typeof mount>

  const SELECTORS = {
    uploadZone: '[data-test="upload-zone"]',
    fileInput: '[data-test="file-input"]',
    uploadError: '[data-test="upload-error"]',
    previewItem: '[data-test="preview-item"]',
    imagePreview: '[data-test="image-preview"]',
    removeButton: '[data-test="remove-button"]'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: MOCK_IMAGE_URL })
    })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render upload zone with correct initial state', () => {
      wrapper = mount(MultiFileUpload)

      expect(wrapper.find(SELECTORS.uploadZone).exists()).toBe(true)
      expect(wrapper.text()).toContain('Add Screenshot or File')
      expect(wrapper.text()).toContain('Maximum 10 files (10 MB max per file)')
    })

    it('should render ButtonUI with correct props', () => {
      wrapper = mount(MultiFileUpload)
      const button = wrapper.findComponent(ButtonUI)

      expect(button.exists()).toBe(true)
      expect(button.props('variant')).toBe('glass')
      expect(button.props('loading')).toBe(false)
      expect(button.props('disabled')).toBe(false)
    })
  })

  describe('File Selection', () => {
    it('should open file dialog when upload zone is clicked', async () => {
      wrapper = mount(MultiFileUpload)
      const fileInput = wrapper.find(SELECTORS.fileInput).element as HTMLInputElement
      const clickSpy = vi.spyOn(fileInput, 'click')

      await wrapper.find(SELECTORS.uploadZone).trigger('click')

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should upload image file successfully', async () => {
      wrapper = mount(MultiFileUpload)

      const file = new File(['test'], 'test-image.png', { type: 'image/png' })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/upload',
        expect.objectContaining({
          method: 'POST',
          headers: { Authorization: 'Bearer mock-auth-token' }
        })
      )

      // Check that preview is shown with uploaded URL, not blob URL
      await nextTick()
      const previews = wrapper.findAll(SELECTORS.previewItem)
      expect(previews).toHaveLength(1)

      const img = wrapper.find(SELECTORS.imagePreview)
      expect(img.exists()).toBe(true)
      // After upload, should show the backend URL, not blob:
      expect(img.attributes('src')).toBe(MOCK_IMAGE_URL)
    })

    it('should show error for non-image files', async () => {
      wrapper = mount(MultiFileUpload)

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await nextTick()

      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.uploadError).text()).toContain('Only images')
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith('Only images are allowed')
    })

    it('should show error for oversized files', async () => {
      wrapper = mount(MultiFileUpload)

      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11 MB
      const file = new File([largeContent], 'large-image.png', { type: 'image/png' })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await nextTick()

      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.uploadError).text()).toContain('exceed')
    })

    it('should reject more than 10 files', async () => {
      wrapper = mount(MultiFileUpload)

      const files = Array.from(
        { length: 11 },
        (_, i) => new File(['test'], `image${i}.png`, { type: 'image/png' })
      )

      const fileInput = wrapper.find(SELECTORS.fileInput)
      Object.defineProperty(fileInput.element, 'files', {
        value: files,
        writable: false
      })

      await fileInput.trigger('change')
      await nextTick()

      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
      expect(wrapper.find(SELECTORS.uploadError).text()).toContain('Maximum 10 files')
    })
  })

  describe('File Upload', () => {
    it('should show loading state during upload', async () => {
      let resolveUpload: (value: any) => void
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve
      })

      mockFetch.mockReturnValue(uploadPromise)

      wrapper = mount(MultiFileUpload)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await nextTick()

      // Should show loading state
      expect(wrapper.findComponent(ButtonUI).props('loading')).toBe(true)

      resolveUpload!({
        ok: true,
        json: async () => ({ imageUrl: MOCK_IMAGE_URL })
      })

      await flushPromises()
      await nextTick()

      // Loading state should be cleared
      expect(wrapper.findComponent(ButtonUI).props('loading')).toBe(false)
    })

    it('should handle upload error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Upload failed' })
      })

      wrapper = mount(MultiFileUpload)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
      expect(mockToastStore.addErrorToast).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload')
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('File Removal', () => {
    it('should remove file when remove button is clicked', async () => {
      wrapper = mount(MultiFileUpload)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(wrapper.findAll(SELECTORS.previewItem)).toHaveLength(1)

      await wrapper.find(SELECTORS.removeButton).trigger('click')
      await nextTick()

      expect(wrapper.findAll(SELECTORS.previewItem)).toHaveLength(0)
    })
  })

  describe('Event Emissions', () => {
    it('should emit update:screens with uploaded URLs', async () => {
      wrapper = mount(MultiFileUpload)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(wrapper.emitted('update:screens')).toBeTruthy()
      expect(wrapper.emitted('update:screens')?.[0]).toEqual([[MOCK_IMAGE_URL]])
    })
  })

  describe('Reset Functionality', () => {
    it('should reset upload state', async () => {
      wrapper = mount(MultiFileUpload)

      const file = new File(['test'], 'test.png', { type: 'image/png' })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(wrapper.findAll(SELECTORS.previewItem)).toHaveLength(1)

      wrapper.vm.resetUpload()
      await nextTick()

      expect(wrapper.findAll(SELECTORS.previewItem)).toHaveLength(0)
      expect(wrapper.emitted('update:screens')).toBeTruthy()
      const lastEmit = wrapper.emitted('update:screens')?.slice(-1)[0]
      expect(lastEmit).toEqual([[]])
    })
  })
})
