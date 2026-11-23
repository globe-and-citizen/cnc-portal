import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import ExpandableFileGallery from '../ExpandableFileGallery.vue'
import type { FilePreviewItem } from '@/types/file-preview'
import { useFileUrl } from '@/composables/useFileUrl'
import { mockGetFileUrlApi } from '@/tests/mocks'

const createPreview = (fileName: string, key = fileName): FilePreviewItem => ({
  key,
  fileName,
  previewUrl: 'https://files.example/incoming',
  fileSize: 1024,
  isImage: fileName.endsWith('.png')
})

describe('ExpandableFileGallery', () => {
  let wrapper: VueWrapper
  const mountComponent = (previews: FilePreviewItem[]) => {
    wrapper = mount(ExpandableFileGallery, {
      props: { previews },
      global: { stubs: { Teleport: true } }
    })
    return wrapper
  }
  beforeEach(() => {
    useFileUrl().clearCache()
    mockGetFileUrlApi.mockImplementation(async (key) => ({
      url: `https://files.example/${key}`,
      expiresIn: 3600
    }))
  })
  afterEach(() => wrapper?.unmount())

  it('renders nothing without previews', () => {
    expect(mountComponent([]).find('[data-test="avatar-stack"]').exists()).toBe(false)
  })
  it('shows four avatars and the remaining count', async () => {
    mountComponent(['a.png', 'b.pdf', 'c.zip', 'd.bin', 'e.txt'].map((name) => createPreview(name)))
    await flushPromises()
    expect(wrapper.findAll('[data-test="avatar-item"]')).toHaveLength(4)
    expect(wrapper.find('[data-test="avatar-remaining"]').text()).toBe('+1')
  })
  it('opens a local image without a signing request and closes with Escape', async () => {
    mountComponent([createPreview('a.png', '')])
    await wrapper.trigger('mouseenter')
    await wrapper.find('[data-test="expanded-preview"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="expanded-preview-modal"] img').attributes('src')).toBe(
      'https://files.example/incoming'
    )
    expect(mockGetFileUrlApi).not.toHaveBeenCalled()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(wrapper.find('[data-test="expanded-preview-modal"]').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })
  it.each([
    ['report.pdf', 'iframe'],
    ['archive.zip', 'Compressed file - Download required'],
    ['binary.bin', 'Download required for this file type']
  ])('renders the existing preview mode for %s', async (name, expected) => {
    mountComponent([createPreview(name)])
    await flushPromises()
    await wrapper.find('[data-test="expanded-preview"]').trigger('click')
    await flushPromises()
    if (expected === 'iframe')
      expect(wrapper.find('iframe').attributes('src')).toBe(`https://files.example/${name}`)
    else expect(wrapper.text()).toContain(expected)
    await wrapper.find('[data-test="expanded-preview-close"]').trigger('click')
    expect(wrapper.find('[data-test="expanded-preview-modal"]').exists()).toBe(false)
  })
})
