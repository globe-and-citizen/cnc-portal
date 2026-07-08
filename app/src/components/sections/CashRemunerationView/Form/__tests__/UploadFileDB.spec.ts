import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import UploadFileDB from '@/components/sections/CashRemunerationView/Form/UploadFileDB.vue'
import { renderWithProviders } from '@/tests/mocks'
import { MAX_FILES } from '@/types/upload'

const UFileUploadStub = defineComponent({
  name: 'UFileUpload',
  props: {
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:model-value', 'open'],
  methods: {
    open() {
      if (!this.disabled) {
        this.$emit('open')
      }
    }
  },
  template: `
    <div data-test="file-input">
      <slot :open="open" />
    </div>
  `
})

describe('UploadFileDB', () => {
  let wrapper: ReturnType<typeof mount>

  const SELECTORS = {
    uploadZone: '[data-test="upload-zone"]',
    uploadError: '[data-test="upload-error"]'
  } as const

  const createWrapper = (props = {}) => {
    return renderWithProviders(UploadFileDB, {
      props: {
        disabled: false,
        existingFileCount: 0,
        ...props
      },
      global: {
        stubs: {
          UFileUpload: UFileUploadStub,
          FilePreviewGallery: true
        }
      }
    })
  }

  const emitFilesUpdate = async (files: File[] | File | null | undefined) => {
    // eslint-disable-next-line no-restricted-syntax -- onFilesUpdate is the @update:model-value handler for the auto-imported UFileUpload; auto-imported Nuxt UI components bypass test stubs, so there is no reachable child instance to emit from
    const vm = wrapper.vm as unknown as {
      onFilesUpdate: (newFiles: File[] | File | null | undefined) => void
    }
    vm.onFilesUpdate(files)
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('File Type Validation', () => {
    it('should accept document files (pdf, txt, zip, docx, xls, xlsx)', async () => {
      wrapper = createWrapper()

      const validDocs = [
        new File([''], 'test.pdf', { type: 'application/pdf' }),
        new File([''], 'test.txt', { type: 'text/plain' }),
        new File([''], 'test.zip', { type: 'application/zip' }),
        new File([''], 'test.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }),
        new File([''], 'test.xls', { type: 'application/vnd.ms-excel' }),
        new File([''], 'test.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
      ]

      await emitFilesUpdate(validDocs)

      expect(wrapper.emitted('update:files')?.[0]?.[0]).toHaveLength(6)
    })

    it('should accept excel files by extension when MIME type is missing', async () => {
      wrapper = createWrapper()

      const validDocs = [
        new File([''], 'report.xlsx', { type: '' }),
        new File([''], 'legacy.xls', { type: 'application/octet-stream' })
      ]

      await emitFilesUpdate(validDocs)

      expect(wrapper.emitted('update:files')?.[0]?.[0]).toHaveLength(2)
    })

    it('should reject invalid file types', async () => {
      wrapper = createWrapper()

      const invalidFiles = [
        new File([''], 'test.exe', { type: 'application/x-msdownload' }),
        new File([''], 'test.mp3', { type: 'audio/mpeg' })
      ]

      await emitFilesUpdate(invalidFiles)

      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
    })
  })

  describe('File Size Validation', () => {
    it('should reject files over 10 MB', async () => {
      wrapper = createWrapper()

      const oversizedFile = new File(['x'.repeat(11 * 1024 * 1024)], 'test.png', {
        type: 'image/png'
      })

      await emitFilesUpdate([oversizedFile])

      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
    })
  })

  describe('File Count Limits', () => {
    it('should reject more than 10 files', async () => {
      wrapper = createWrapper()

      const files = Array.from(
        { length: 11 },
        (_, i) => new File(['content'], `test${i}.png`, { type: 'image/png' })
      )

      await emitFilesUpdate(files)

      expect(wrapper.find(SELECTORS.uploadError).exists()).toBe(true)
    })
  })

  describe('Drag and Drop', () => {
    it('should handle file drop', async () => {
      wrapper = createWrapper()

      const file = new File(['content'], 'test.png', { type: 'image/png' })
      await emitFilesUpdate([file])

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
    it('should be enabled when disabled prop is false', async () => {
      wrapper = createWrapper({ disabled: false })
      const zone = wrapper.find(SELECTORS.uploadZone)

      await zone.trigger('click')

      expect(zone.attributes('data-disabled')).toBeUndefined()
    })

    it('should be disabled when disabled prop is true', async () => {
      wrapper = createWrapper({ disabled: true })
      const zone = wrapper.find(SELECTORS.uploadZone)

      await zone.trigger('click')

      expect(zone.attributes('data-disabled')).toBe('true')
    })

    it('should ignore file input change when files is null', async () => {
      wrapper = createWrapper({ disabled: false })

      await emitFilesUpdate(null)

      expect(wrapper.emitted('update:files')?.[0]?.[0]).toEqual([])
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

      const file = new File(['content'], 'test.png', { type: 'image/png' })

      await emitFilesUpdate([file])

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

      const file = new File(['content'], 'test.png', { type: 'image/png' })

      await emitFilesUpdate([file])

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
      const file = new File(['content'], 'test.png', { type: 'image/png' })

      await emitFilesUpdate([file])

      const gallery = wrapper.findComponent({ name: 'FilePreviewGallery' })
      gallery.vm.$emit('remove', 0)
      await flushPromises()

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLSpy).not.toHaveBeenCalled()
    })

    it('should reset gracefully when file input ref is missing', async () => {
      wrapper = createWrapper()

      expect(() => wrapper.vm.resetUpload()).not.toThrow()
    })

    it('should reset without revoking when previewUrl is empty', async () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('')
      const revokeObjectURLSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => undefined)

      wrapper = createWrapper()
      const file = new File(['content'], 'test.png', { type: 'image/png' })

      await emitFilesUpdate([file])

      wrapper.vm.resetUpload()
      await flushPromises()

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
      expect(revokeObjectURLSpy).not.toHaveBeenCalled()
    })

    it('should apply disabled upload state when isUploading is true', async () => {
      wrapper = createWrapper()
      // eslint-disable-next-line no-restricted-syntax -- isUploading has no public setter; the component never flips it on its own (reserved for a future async upload flow), so the disabled/loading template branch can only be exercised by setting the internal ref directly
      ;(wrapper.vm as unknown as { isUploading: boolean }).isUploading = true
      await flushPromises()

      const zone = wrapper.find(SELECTORS.uploadZone)
      const button = wrapper.find('button')

      expect(zone.attributes('data-disabled')).toBe('true')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })
})
