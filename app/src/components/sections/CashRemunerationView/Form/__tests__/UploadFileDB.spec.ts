import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import UploadFileDB from '@/components/sections/CashRemunerationView/Form/UploadFileDB.vue'
import { createTestingPinia } from '@pinia/testing'
import { MAX_FILES } from '@/types/upload'

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
            template: '<button :disabled="disabled"><slot /></button>',
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

    it('should ignore drop when no files are provided', async () => {
      wrapper = createWrapper()
      const zone = wrapper.find(SELECTORS.uploadZone)

      await zone.trigger('drop', { dataTransfer: null })
      await flushPromises()

      expect(wrapper.emitted('update:files')).toBeFalsy()
    })

    it('should handle dragover event without side effects', async () => {
      wrapper = createWrapper()
      const zone = wrapper.find(SELECTORS.uploadZone)

      await zone.trigger('dragover')
      await flushPromises()

      expect(wrapper.emitted('update:files')).toBeFalsy()
    })
  })

  describe('Open File Dialog', () => {
    it('should open file dialog on zone click when enabled', async () => {
      wrapper = createWrapper({ disabled: false })
      const zone = wrapper.find(SELECTORS.uploadZone)
      const fileInput = wrapper.find(SELECTORS.fileInput)
      const clickSpy = vi.spyOn(fileInput.element as HTMLInputElement, 'click')

      await zone.trigger('click')

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should not open file dialog when disabled', async () => {
      wrapper = createWrapper({ disabled: true })
      const zone = wrapper.find(SELECTORS.uploadZone)
      const fileInput = wrapper.find(SELECTORS.fileInput)
      const clickSpy = vi.spyOn(fileInput.element as HTMLInputElement, 'click')

      await zone.trigger('click')

      expect(clickSpy).not.toHaveBeenCalled()
    })

    it('should ignore file input change when files is null', async () => {
      wrapper = createWrapper({ disabled: false })
      const fileInput = wrapper.find(SELECTORS.fileInput)

      Object.defineProperty(fileInput.element, 'files', {
        value: null,
        writable: true
      })

      await fileInput.trigger('change')
      await flushPromises()

      expect(wrapper.emitted('update:files')).toBeFalsy()
    })

    it('should disable select button when max file count is reached', async () => {
      wrapper = createWrapper({ existingFileCount: MAX_FILES })

      const button = wrapper.find('button')
      expect(button.attributes('disabled')).toBeDefined()
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

    it('should remove a file when gallery emits remove', async () => {
      const revokeObjectURLSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => undefined)

      wrapper = createWrapper({
        existingFileCount: 0
      })

      const fileInput = wrapper.find(SELECTORS.fileInput)
      const file = new File(['content'], 'test.png', { type: 'image/png' })

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      const gallery = wrapper.findComponent({ name: 'FilePreviewGallery' })
      gallery.vm.$emit('remove', 0)
      await flushPromises()

      const emittedFiles = wrapper.emitted('update:files')
      expect(emittedFiles).toBeTruthy()
      expect(emittedFiles?.[0]?.[0]).toHaveLength(1)
      expect(emittedFiles?.[1]?.[0]).toHaveLength(0)
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
    })

    it('should remove file without revoking when previewUrl is empty', async () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('')
      const revokeObjectURLSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => undefined)

      wrapper = createWrapper()
      const fileInput = wrapper.find(SELECTORS.fileInput)
      const file = new File(['content'], 'test.png', { type: 'image/png' })

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      const gallery = wrapper.findComponent({ name: 'FilePreviewGallery' })
      gallery.vm.$emit('remove', 0)
      await flushPromises()

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLSpy).not.toHaveBeenCalled()
    })

    it('should reset gracefully when file input ref is missing', async () => {
      wrapper = createWrapper()
      ;(wrapper.vm as unknown as { fileInput: { value: HTMLInputElement | null } }).fileInput = {
        value: null
      }

      expect(() => wrapper.vm.resetUpload()).not.toThrow()
    })

    it('should reset without revoking when previewUrl is empty', async () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('')
      const revokeObjectURLSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => undefined)

      wrapper = createWrapper()
      const fileInput = wrapper.find(SELECTORS.fileInput)
      const file = new File(['content'], 'test.png', { type: 'image/png' })

      Object.defineProperty(fileInput.element, 'files', {
        value: [file],
        writable: false
      })

      await fileInput.trigger('change')
      await flushPromises()

      wrapper.vm.resetUpload()
      await flushPromises()

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLSpy).not.toHaveBeenCalled()
    })

    it('should reset when internal fileInput ref is null', async () => {
      wrapper = createWrapper()
      ;(wrapper.vm as unknown as { fileInput: HTMLInputElement | null }).fileInput = null

      expect(() => wrapper.vm.resetUpload()).not.toThrow()
    })

    it('should apply disabled upload state when isUploading is true', async () => {
      wrapper = createWrapper()
      ;(wrapper.vm as unknown as { isUploading: boolean }).isUploading = true
      await flushPromises()

      const zone = wrapper.find(SELECTORS.uploadZone)
      const button = wrapper.find('button')

      expect(zone.classes()).toContain('opacity-50')
      expect(zone.classes()).toContain('pointer-events-none')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })
})
