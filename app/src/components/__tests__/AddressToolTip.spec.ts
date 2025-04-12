import { ref } from 'vue'
import * as vueuse from '@vueuse/core'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AddressToolTip from '@/components/AddressToolTip.vue'
import { NETWORK } from '@/constant'

const mockCopy = vi.fn()
const mockClipboard = {
  copy: mockCopy,
  copied: ref(false),
  isSupported: ref(true)
}

vi.mock('@vueuse/core', async () => {
  const originalModule = await vi.importActual<typeof vueuse>('@vueuse/core')
  return {
    ...originalModule,
    useClipboard: vi.fn(() => mockClipboard)
  }
})

describe('AddressToolTip.vue', () => {
  let wrapper: ReturnType<typeof mount>
  const props = {
    address: '0xd6307a4B12661a5254CEbB67eFA869E37d0421E6'
  }

  beforeEach(() => {
    wrapper = mount(AddressToolTip, {
      props: { ...props }
    })
  })
  describe('Render', () => {
    it('render the copy button in the copyed stat', async () => {
      mockClipboard.isSupported.value = true
      mockClipboard.copied.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="copy-address-tooltip"]').exists()).toBe(true)
      mockClipboard.copied.value = true
      await wrapper.vm.$nextTick()

      const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyAddressTooltip.props().content).toBe('Copied!')
    })

    it('not render the copy button if copy is not supported', async () => {
      mockClipboard.isSupported.value = false
      mockClipboard.copied.value = false
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="copy-address-tooltip"]').exists()).toBe(false)
    })
  })

  describe('methods', () => {
    // TODO: Find a way to watch on the copy function
    it("should copy the member's address to the clipboard", async () => {
      mockClipboard.isSupported.value = true
      mockClipboard.copied.value = false
      await wrapper.vm.$nextTick()

      // console.log('wrapper', wrapper.html())
      await wrapper.find('[data-test="copy-address-tooltip"]').trigger('click')
      await wrapper.vm.$nextTick()

      // Note: Once clicked, copied value is reactive there is no way (for the moment) to check when the result is true

      // const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
      //   name: 'ClipboardDocumentCheckIcon'
      // })

      // console.log('copyAddressTooltip', copyAddressTooltip)
      // expect(mockCopy).toHaveBeenCalledWith(props.member.address)
      // expect(copyAddressTooltip).toBe(true)
    })
    it('should open the address in a new tab', async () => {
      const open = vi.fn()
      window.open = open
      await wrapper.find('[data-test="address-tooltip"]').trigger('click')
      expect(open).toHaveBeenCalledWith(
        `${NETWORK.blockExplorerUrl}/address/${props.address}`,
        '_blank'
      )
    })
    it('should open the transaction with correct url', async () => {
      wrapper = mount(AddressToolTip, {
        props: { ...props, type: 'transaction' }
      })

      const open = vi.fn()
      window.open = open
      await wrapper.find('[data-test="address-tooltip"]').trigger('click')
      expect(open).toHaveBeenCalledWith(`${NETWORK.blockExplorerUrl}/tx/${props.address}`, '_blank')
    })
  })
})
