import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import StandardGallery from '../FilePreviewGallery.vue'
import ExpandableGallery from '../ExpandableFileGallery.vue'
import { useFileUrl } from '@/composables/useFileUrl'
import { mockGetFileUrlApi } from '@/tests/mocks'
import type { FilePreviewItem } from '@/types/file-preview'

const file: FilePreviewItem = {
  key: 'proof',
  fileName: 'proof.png',
  fileSize: 10,
  isImage: true,
  previewUrl: 'https://files.example/incoming-stale'
}
const variants = [
  {
    name: 'standard',
    component: StandardGallery,
    open: 'image-preview',
    modal: 'upload-lightbox-modal',
    download: 'upload-lightbox-download'
  },
  {
    name: 'expandable',
    component: ExpandableGallery,
    open: 'expanded-preview',
    modal: 'expanded-preview-modal',
    download: 'expanded-preview-download'
  }
]

describe.each(variants)(
  '$name gallery real URL lifecycle',
  ({ component, open, modal, download }) => {
    let wrapper: VueWrapper
    let now: number
    const popup = {
      opener: {} as unknown,
      closed: false,
      close: vi.fn(),
      location: { replace: vi.fn() },
      document: document.implementation.createHTMLDocument()
    }
    const select = (id: string) => wrapper.find(`[data-test="${id}"]`)
    const render = async () => {
      wrapper = mount(component, {
        props: { previews: [file] },
        global: { stubs: { Teleport: true } }
      })
      await flushPromises()
      await wrapper.trigger('mouseenter')
    }
    const openFile = async () => {
      await select(open).trigger('click')
      await flushPromises()
    }
    beforeEach(() => {
      vi.clearAllMocks()
      useFileUrl().clearCache()
      now = Date.now()
      vi.spyOn(Date, 'now').mockImplementation(() => now)
      mockGetFileUrlApi.mockResolvedValue({ url: 'https://files.example/v1', expiresIn: 3600 })
      popup.document.body.innerHTML = ''
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
      vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    })
    afterEach(() => {
      wrapper?.unmount()
      vi.restoreAllMocks()
    })

    it('reuses valid central cache, then renews on opening without a prop change', async () => {
      await render()
      await openFile()
      expect(select(modal).find('img').attributes('src')).toBe('https://files.example/v1')
      expect(mockGetFileUrlApi).toHaveBeenCalledTimes(1)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      now += 51 * 60 * 1000
      mockGetFileUrlApi.mockResolvedValue({ url: 'https://files.example/v2', expiresIn: 3600 })
      await openFile()
      expect(select(modal).find('img').attributes('src')).toBe('https://files.example/v2')
      expect(mockGetFileUrlApi).toHaveBeenCalledTimes(2)
      expect(mockGetFileUrlApi).toHaveBeenLastCalledWith('proof')
      expect(file.previewUrl).toBe('https://files.example/incoming-stale')
    })

    it('reserves a protected popup before a delayed renewal from an open modal', async () => {
      await render()
      await openFile()
      now += 51 * 60 * 1000
      let finish!: (value: { url: string; expiresIn: number }) => void
      mockGetFileUrlApi.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      await select(download).trigger('click')
      expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
      expect(popup.opener).toBeNull()
      expect(popup.document.querySelector('meta[name="referrer"]')?.getAttribute('content')).toBe(
        'no-referrer'
      )
      expect(popup.document.querySelector('a')).toBeNull()
      finish({ url: 'https://files.example/v2', expiresIn: 3600 })
      await flushPromises()
      expect(popup.document.querySelector('a')?.href).toBe('https://files.example/v2')
      expect(popup.document.querySelector('a')?.rel).toBe('noopener noreferrer')
    })

    it('keeps expired URLs closed on renewal failure and recovers on the next opening', async () => {
      await render()
      now += 51 * 60 * 1000
      mockGetFileUrlApi.mockResolvedValueOnce({ url: '', expiresIn: 3600 })
      await openFile()
      expect(select(modal).exists()).toBe(false)
      expect(wrapper.text()).toContain('Unable to load this file')
      mockGetFileUrlApi.mockResolvedValue({
        url: 'https://files.example/recovered',
        expiresIn: 3600
      })
      await openFile()
      expect(select(modal).find('img').attributes('src')).toBe('https://files.example/recovered')
    })

    it('closes the reserved popup when renewal fails', async () => {
      await render()
      await openFile()
      now += 51 * 60 * 1000
      mockGetFileUrlApi.mockResolvedValueOnce({ url: '', expiresIn: 3600 })
      await select(download).trigger('click')
      await flushPromises()
      expect(popup.close).toHaveBeenCalledOnce()
      expect(popup.document.querySelector('a')).toBeNull()
      expect(select(modal).find('[data-test="file-download-error"]').text()).toContain(
        'Unable to download this file'
      )
    })

    it.each(['close', 'remove', 'unmount'])(
      'does not apply a delayed opening after %s',
      async (action) => {
        await render()
        now += 51 * 60 * 1000
        let finish!: (value: { url: string; expiresIn: number }) => void
        mockGetFileUrlApi.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finish = resolve
            })
        )
        await select(open).trigger('click')
        if (action === 'close')
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        if (action === 'remove') await wrapper.setProps({ previews: [] })
        if (action === 'unmount') wrapper.unmount()
        finish({ url: 'https://files.example/late', expiresIn: 3600 })
        await flushPromises()
        expect(select(modal).exists()).toBe(false)
        expect(document.body.style.overflow).toBe('')
      }
    )

    it('retries an initially unavailable thumbnail through the real URL owner', async () => {
      mockGetFileUrlApi.mockResolvedValueOnce({ url: '', expiresIn: 3600 })
      await render()
      expect(wrapper.text()).toContain('Some files could not be loaded')
      mockGetFileUrlApi.mockResolvedValue({
        url: 'https://files.example/recovered',
        expiresIn: 3600
      })
      await select('file-preview-retry').trigger('click')
      await flushPromises()
      await openFile()
      expect(select(modal).find('img').attributes('src')).toBe('https://files.example/recovered')
      expect(mockGetFileUrlApi).toHaveBeenCalledTimes(2)
    })

    it('closes a pending download when its file is removed', async () => {
      await render()
      await openFile()
      now += 51 * 60 * 1000
      let finish!: (value: { url: string; expiresIn: number }) => void
      mockGetFileUrlApi.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      await select(download).trigger('click')
      await wrapper.setProps({ previews: [] })
      finish({ url: 'https://files.example/late', expiresIn: 3600 })
      await flushPromises()
      expect(popup.close).toHaveBeenCalledOnce()
      expect(popup.document.querySelector('a')).toBeNull()
    })

    it('retains selection by key across list replacement, then closes when that key is removed', async () => {
      await render()
      await openFile()
      await wrapper.setProps({
        previews: [{ ...file, previewUrl: 'https://files.example/changed-input' }]
      })
      await flushPromises()
      expect(select(modal).exists()).toBe(true)
      await wrapper.setProps({ previews: [{ ...file, key: 'another-file' }] })
      await flushPromises()
      expect(select(modal).exists()).toBe(false)
    })

    it('never lets an older list load overwrite its replacement', async () => {
      let finish!: (value: { url: string; expiresIn: number }) => void
      mockGetFileUrlApi.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          })
      )
      wrapper = mount(component, {
        props: { previews: [file] },
        global: { stubs: { Teleport: true } }
      })
      await wrapper.setProps({
        previews: [{ ...file, key: 'replacement', fileName: 'replacement.png' }]
      })
      await flushPromises()
      finish({ url: 'https://files.example/obsolete', expiresIn: 3600 })
      await flushPromises()
      await openFile()
      expect(select(modal).find('img').attributes('src')).toBe('https://files.example/v1')
      expect(select(modal).find('img').attributes('alt')).toBe('replacement.png')
    })
  }
)
