import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import ProfileImageUpload from '../ProfileImageUpload.vue'
import { mockUploadFileState } from '@/tests/mocks/composables.mock'

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

  const mountComponent = (props = {}) => mount(ProfileImageUpload, { props })

  const triggerFileSelection = async (file: File) => {
    const input = wrapper.find(SELECTORS.fileInput)
    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false
    })
    await input.trigger('change')
    await flushPromises()
  }

  // Replay the `onSuccess` callback the component passed to
  // `uploadFile(file, { onSuccess })` with a freshly uploaded URL.
  const replayUploadSuccess = async (url: string) => {
    const lastCall = mockUploadFileState.mutate.mock.calls.at(-1)
    const onSuccess = (lastCall?.[1] as { onSuccess?: (u: string) => unknown } | undefined)
      ?.onSuccess
    await onSuccess?.(url)
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Validation', () => {
    it('rejects non-image files without calling the mutation', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('document.pdf', 'application/pdf'))

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(mockUploadFileState.mutate).not.toHaveBeenCalled()
    })

    it('rejects files larger than 10MB without calling the mutation', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('large.png', 'image/png', 11 * 1024 * 1024))

      expect(wrapper.find(SELECTORS.errorMessage).exists()).toBe(true)
      expect(mockUploadFileState.mutate).not.toHaveBeenCalled()
    })

    it('accepts image by extension fallback when MIME type is empty', async () => {
      wrapper = mountComponent()
      await triggerFileSelection(createMockFile('avatar.png', ''))

      expect(mockUploadFileState.mutate).toHaveBeenCalledOnce()
      expect(mockUploadFileState.mutate).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })
  })

  describe('Upload', () => {
    it('uploads and emits the new model value on success', async () => {
      const expectedUrl = 'https://storage.railway.app/uploaded-image.png'

      wrapper = mountComponent({ modelValue: '' })
      await triggerFileSelection(createMockFile('avatar.png', 'image/png'))

      expect(mockUploadFileState.mutate).toHaveBeenCalledOnce()
      await replayUploadSuccess(expectedUrl)

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[emitted.length - 1]).toEqual([expectedUrl])
    })

    it('surfaces the mutation error reactively', async () => {
      wrapper = mountComponent()
      mockUploadFileState.error.value = new Error('Upload failed')
      await wrapper.vm.$nextTick()

      const alert = wrapper.find(SELECTORS.errorMessage)
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Upload failed')
    })
  })

  describe('UI states', () => {
    it('shows uploading state while the mutation is pending', async () => {
      mockUploadFileState.isPending.value = true

      wrapper = mountComponent({ modelValue: '' })
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Uploading...')
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

      expect(mockUploadFileState.mutate).not.toHaveBeenCalled()
    })

    it('reflects existing image state when model value is provided', () => {
      wrapper = mountComponent({ modelValue: 'https://storage.railway.app/existing.png' })

      expect(wrapper.find(SELECTORS.uploadBox).attributes('data-has-image')).toBe('true')
    })
  })
})
