import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import UploadFileDB from '@/components/sections/CashRemunerationView/Form/UploadFileDB.vue'
import { createTestingPinia } from '@pinia/testing'

// Mock toast store
const errorToastMock = vi.fn()

const { mockUseToastStore } = vi.hoisted(() => ({
  mockUseToastStore: vi.fn(() => ({
    addErrorToast: errorToastMock
  }))
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: mockUseToastStore
}))

describe('UploadFileDB', () => {
  let wrapper: ReturnType<typeof mount>

  const SELECTORS = {
    uploadZone: '[data-test="upload-zone"]',
    fileInput: '[data-test="file-input"]',
    uploadError: '[data-test="upload-error"]'
  } as const

  const createWrapper = (props = {}) => {
    return mount(UploadFileDB, {
      props: {
        disabled: false,
        existingFileCount: 0,
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          ButtonUI: {
            template: '<button><slot /></button>',
            props: ['loading', 'disabled', 'variant']
          },
          FilePreviewGallery: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('File Type Validation', () => {
    it('should accept document files (pdf, txt, zip, docx)', async () => {
      wrapper = createWrapper()
      const fileInput = wrapper.find(SELECTORS.fileInput)

      const validDocs = [
        new File([''], 'test.pdf', { type: 'application/pdf' }),
        new File([''], 'test.txt', { type: 'text/plain' }),
        new File([''], 'test.zip', { type: 'application/zip' }),
        new File([''], 'test.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        })
      ]

      Object.defineProperty(fileInput.element, 'files', {
        value: validDocs,
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(wrapper.emitted('update:files')?.[0]?.[0]).toHaveLength(4)
      expect(errorToastMock).not.toHaveBeenCalled()
    })

    it('should reject invalid file types', async () => {
      wrapper = createWrapper()
      const fileInput = wrapper.find(SELECTORS.fileInput)

      const invalidFiles = [
        new File([''], 'test.exe', { type: 'application/x-msdownload' }),
        new File([''], 'test.mp3', { type: 'audio/mpeg' })
      ]

      Object.defineProperty(fileInput.element, 'files', {
        value: invalidFiles,
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(errorToastMock).toHaveBeenCalledWith('Only images and documents are allowed')
      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
    })
  })

  describe('File Size Validation', () => {
    it('should reject files over 10 MB', async () => {
      wrapper = createWrapper()
      const fileInput = wrapper.find(SELECTORS.fileInput)

      const oversizedFile = new File(['x'.repeat(11 * 1024 * 1024)], 'test.png', {
        type: 'image/png'
      })

      Object.defineProperty(fileInput.element, 'files', {
        value: [oversizedFile],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(errorToastMock).toHaveBeenCalled()
      expect(errorToastMock.mock.calls[0]?.[0]).toContain('exceed the 10 MB limit')
      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
    })
  })

  describe('File Count Limits', () => {
    it('should reject more than 10 files', async () => {
      wrapper = createWrapper()
      const fileInput = wrapper.find(SELECTORS.fileInput)

      const files = Array.from(
        { length: 11 },
        (_, i) => new File(['content'], `test${i}.png`, { type: 'image/png' })
      )

      Object.defineProperty(fileInput.element, 'files', {
        value: files,
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(errorToastMock).toHaveBeenCalledWith('Maximum 10 files allowed')
      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
    })
  })

  describe('Drag and Drop', () => {
    it('should handle file drop', async () => {
      wrapper = createWrapper()
      const zone = wrapper.find(SELECTORS.uploadZone)

      const file = new File(['content'], 'test.png', { type: 'image/png' })
      const dataTransfer = {
        files: [file]
      }

      await zone.trigger('drop', { dataTransfer })
      await flushPromises()

      expect(wrapper.emitted('update:files')).toBeTruthy()
      expect(wrapper.emitted('update:files')?.[0]?.[0]).toHaveLength(1)
    })
  })

  describe('Reset Functionality', () => {
    it('should reset uploaded files when resetUpload is called', async () => {
      wrapper = createWrapper()
      const fileInput = wrapper.find(SELECTORS.fileInput)

      const file = new File(['content'], 'test.png', { type: 'image/png' })

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(wrapper.emitted('update:files')?.[0]?.[0]).toHaveLength(1)

      // Call exposed resetUpload method
      await wrapper.vm.resetUpload()
      await flushPromises()

      expect(wrapper.emitted('update:files')?.[1]?.[0]).toHaveLength(0)
    })
  })
})
