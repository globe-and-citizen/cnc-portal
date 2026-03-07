import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, nextTick, type Ref } from 'vue'
import ExpandableFileGallery from '../ExpandableFileGallery.vue'
import type { FilePreviewItem } from '@/types/file-preview'
import { useFilePreviewGallery } from '@/composables/useFilePreviewGallery'

vi.mock('@/composables/useFilePreviewGallery', () => ({
  useFilePreviewGallery: vi.fn()
}))

vi.mock('@/utils/fileUtil', () => ({
  getFileIcon: vi.fn(() => 'mock-icon'),
  truncateFileName: vi.fn((name: string, length: number) => name.slice(0, length)),
  getFileExtension: vi.fn((name: string) => {
    const parts = name.split('.')
    const ext = parts.length > 1 ? parts[parts.length - 1] : ''
    return ext ? ext.toLowerCase() : ''
  })
}))

const IconStub = {
  props: ['icon'],
  template: '<span :data-icon="icon"></span>'
}

const createPreview = (overrides: Partial<FilePreviewItem> = {}): FilePreviewItem => ({
  key: overrides.key ?? 'key',
  fileName: overrides.fileName ?? 'file.txt',
  previewUrl: overrides.previewUrl ?? 'https://example.com/file.txt',
  fileSize: overrides.fileSize ?? 1024,
  fileType: overrides.fileType ?? 'text/plain',
  isImage: overrides.isImage ?? false
})

describe('ExpandableFileGallery', () => {
  let resolvedPreviewsRef: Ref<FilePreviewItem[]>
  const downloadMock = vi.fn()

  const mountComponent = (previews: FilePreviewItem[] = []) => {
    resolvedPreviewsRef.value = previews

    vi.mocked(useFilePreviewGallery).mockReturnValue({
      urlCache: ref(new Map()),
      modalState: ref({
        type: null,
        url: '',
        fileName: '',
        fileType: '',
        contentType: 'other',
        textContent: ''
      }),
      resolvedPreviews: computed(() => resolvedPreviewsRef.value),
      openModal: vi.fn(async () => undefined),
      closeModal: vi.fn(),
      downloadFile: downloadMock,
      loadPresignedUrls: vi.fn(async () => undefined)
    })

    return mount(ExpandableFileGallery, {
      props: { previews },
      global: {
        stubs: {
          Icon: IconStub,
          Teleport: true
        }
      }
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    resolvedPreviewsRef = ref([])
  })

  it('renders nothing when there are no previews', () => {
    const wrapper = mountComponent([])

    expect(wrapper.find('.avatar-group').exists()).toBe(false)
    expect(wrapper.find('.grid').exists()).toBe(false)
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('renders previews without keys in both views', async () => {
    const previews = [
      createPreview({ key: '', fileName: 'no-key.png', isImage: true, previewUrl: 'https://img/1' })
    ]

    const wrapper = mountComponent(previews)

    expect(wrapper.findAll('.avatar').length).toBe(1)

    await wrapper.trigger('mouseenter')
    expect(wrapper.findAll('.grid button').length).toBe(1)
  })

  it('shows collapsed previews and remaining count', () => {
    const previews = [
      createPreview({ fileName: 'image.png', isImage: true, previewUrl: 'https://img/1' }),
      createPreview({ key: '2', fileName: 'doc.pdf', previewUrl: 'https://doc/1' }),
      createPreview({ key: '3', fileName: 'archive.zip', previewUrl: '' }),
      createPreview({ key: '4', fileName: 'binary.exe', previewUrl: '' }),
      createPreview({ key: '5', fileName: 'extra.txt', previewUrl: 'https://doc/2' }),
      createPreview({
        key: '6',
        fileName: 'extra2.png',
        isImage: true,
        previewUrl: 'https://img/2'
      })
    ]

    const wrapper = mountComponent(previews)

    expect(wrapper.findAll('.avatar-group .avatar').length).toBe(5)
    expect(wrapper.text()).toContain('+2')
    expect(wrapper.find('.grid').isVisible()).toBe(false)
  })

  it('expands on hover and opens image preview modal', async () => {
    const previews = [
      createPreview({ fileName: 'image.png', isImage: true, previewUrl: 'https://img/1' }),
      createPreview({ key: '2', fileName: 'doc.pdf', previewUrl: 'https://doc/1' })
    ]

    const wrapper = mountComponent(previews)

    await wrapper.trigger('mouseenter')
    expect(wrapper.find('.grid').isVisible()).toBe(true)

    await wrapper.find('.grid button').trigger('click')

    expect(wrapper.find('.fixed').exists()).toBe(true)
    expect(wrapper.find('.fixed img').exists()).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    await wrapper.find('.fixed').trigger('click')
    expect(wrapper.find('.fixed').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('')

    await wrapper.trigger('mouseleave')
    expect(wrapper.find('.grid').isVisible()).toBe(false)
  })

  it('renders viewable files in an iframe', async () => {
    const previews = [
      createPreview({ fileName: 'image.png', isImage: true, previewUrl: 'https://img/1' }),
      createPreview({ key: '2', fileName: 'doc.pdf', previewUrl: 'https://doc/1' })
    ]

    const wrapper = mountComponent(previews)

    await wrapper.trigger('mouseenter')
    const buttons = wrapper.findAll('.grid button')
    expect(buttons.length).toBeGreaterThan(1)
    const secondButton = buttons[1]
    expect(secondButton).toBeTruthy()
    await secondButton!.trigger('click')

    expect(wrapper.find('iframe').exists()).toBe(true)
  })

  it('renders compressed file message', async () => {
    const previews = [
      createPreview({ fileName: 'image.png', isImage: true, previewUrl: 'https://img/1' }),
      createPreview({ key: '2', fileName: 'archive.zip', previewUrl: '' })
    ]

    const wrapper = mountComponent(previews)

    await wrapper.trigger('mouseenter')
    const buttons = wrapper.findAll('.grid button')
    expect(buttons.length).toBeGreaterThan(1)
    const secondButton = buttons[1]
    expect(secondButton).toBeTruthy()
    await secondButton!.trigger('click')

    expect(wrapper.text()).toContain('Compressed file - Download required')
  })

  it('renders default message and handles downloads', async () => {
    const previews = [
      createPreview({ fileName: 'binary.exe', previewUrl: 'https://bin/1' }),
      createPreview({ key: '2', fileName: 'no-url.txt', previewUrl: '' })
    ]

    const wrapper = mountComponent(previews)

    await wrapper.trigger('mouseenter')
    const buttons = wrapper.findAll('.grid button')
    expect(buttons.length).toBeGreaterThan(1)
    const firstButton = buttons[0]
    const secondButton = buttons[1]
    expect(firstButton).toBeTruthy()
    expect(secondButton).toBeTruthy()
    await firstButton!.trigger('click')

    expect(wrapper.text()).toContain('Download required for this file type')

    const modalButtons = wrapper.find('.fixed').findAll('button')
    expect(modalButtons.length).toBeGreaterThan(1)
    const downloadButton = modalButtons[1]
    expect(downloadButton).toBeTruthy()
    await downloadButton!.trigger('click')
    expect(downloadMock).toHaveBeenCalledWith('https://bin/1')

    await wrapper.find('.fixed').trigger('click')
    await secondButton!.trigger('click')

    const modalButtonsNoUrl = wrapper.find('.fixed').findAll('button')
    expect(modalButtonsNoUrl.length).toBeGreaterThan(1)
    const downloadButtonNoUrl = modalButtonsNoUrl[1]
    expect(downloadButtonNoUrl).toBeTruthy()
    await downloadButtonNoUrl!.trigger('click')
    expect(downloadMock).toHaveBeenCalledTimes(1)
  })

  it('handles image preview with missing URL and closes via button and Escape', async () => {
    const previews = [
      createPreview({ fileName: 'broken.png', isImage: true, previewUrl: '' }),
      createPreview({ key: '2', fileName: 'doc.pdf', previewUrl: 'https://doc/1' })
    ]

    const wrapper = mountComponent(previews)

    await wrapper.trigger('mouseenter')
    const buttons = wrapper.findAll('.grid button')
    expect(buttons.length).toBeGreaterThan(0)
    const firstButton = buttons[0]
    expect(firstButton).toBeTruthy()
    await firstButton!.trigger('click')

    expect(wrapper.find('.fixed').exists()).toBe(true)
    expect(wrapper.find('.fixed img').exists()).toBe(true)

    const closeButton = wrapper.find('.fixed').find('button')
    expect(closeButton.exists()).toBe(true)
    await closeButton.trigger('click')
    expect(wrapper.find('.fixed').exists()).toBe(false)

    await firstButton!.trigger('click')
    await wrapper.find('.fixed').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('keeps modal controls when current preview is missing', async () => {
    const previews = [
      createPreview({ fileName: 'image.png', isImage: true, previewUrl: 'https://img/1' })
    ]

    const wrapper = mountComponent(previews)

    await wrapper.trigger('mouseenter')
    const buttons = wrapper.findAll('.grid button')
    expect(buttons.length).toBeGreaterThan(0)
    await buttons[0]!.trigger('click')

    const modalState = wrapper.vm as unknown as {
      modal: { value?: { isOpen: boolean; index: number }; isOpen?: boolean; index?: number }
    }
    if (modalState.modal.value) {
      modalState.modal.value = { isOpen: true, index: 2 }
    } else {
      modalState.modal = { isOpen: true, index: 2 }
    }
    await nextTick()

    expect(wrapper.find('.fixed').exists()).toBe(true)
    expect(wrapper.find('.fixed img').exists()).toBe(false)
    expect(wrapper.find('iframe').exists()).toBe(false)

    const modalButtons = wrapper.find('.fixed').findAll('button')
    expect(modalButtons.length).toBeGreaterThan(1)
    await modalButtons[1]!.trigger('click')
    expect(downloadMock).not.toHaveBeenCalled()
  })
})
