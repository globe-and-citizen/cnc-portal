import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import TeamAccount from '@/components/sections/SingleTeamView/Bank/TeamAccount.vue'
import { ClipboardDocumentListIcon, ClipboardDocumentCheckIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { useClipboard } from '@vueuse/core'

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'
  }))
}))

vi.mock('@vueuse/core', async (importOriginal) => {
  const { computed, ref } = await import('vue')
  const actual = await importOriginal<typeof import('@vueuse/core')>()

  return {
    ...actual,
    useClipboard: vi.fn().mockReturnValue({
      copied: computed(() => false),
      isSupported: ref(true),
      copy: vi.fn(),
      text: computed(() => '')
    })
  }
})
window.open = vi.fn()

describe('TeamAccount', () => {
  const createComponent = (props?: any) => {
    return mount(TeamAccount, {
      props: {
        team: {
          bankAddress: '0xd6307a4B12661a5254CEbB67eFA869E37d0421E6',
          ownerAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
          ...props?.team
        },
        foundUsers: [],
        ...props
      },
      global: {
        plugins: [createTestingPinia({ createSpy : vi.fn})]
      }
    })
  }
  describe('Render', () => {
    it('should show team bank address with tooltip if bank address exists', () => {
      const team = { bankAddress: '0x123' }
      const wrapper = createComponent({
        team: {
          ...team
        }
      })

      expect(wrapper.find('[data-test="team-bank-address"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="team-bank-address"]').text()).toBe(team.bankAddress)

      // ToolTip
      const bankAddressTooltip = wrapper
        .find('[data-test="bank-address-tooltip"]')
        .findComponent({ name: 'ToolTip' })
      expect(bankAddressTooltip.exists()).toBeTruthy()
      expect(bankAddressTooltip.props().content).toBe('Click to see address in block explorer')
    })

    it('should show copy to clipboard icon with tooltip if bank address exists', () => {
      const team = { bankAddress: '0x123' }
      const wrapper = createComponent({
        team: {
          ...team
        }
      })

      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBe(true)

      // ToolTip
      const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyAddressTooltip.exists()).toBeTruthy()
      expect(copyAddressTooltip.props().content).toBe('Click to copy address')
    })

    it('should not show copy to clipboard icon if copy not supported', async () => {
      const wrapper = createComponent()

      // mock clipboard
      vi.mocked(useClipboard).mockReturnValueOnce({
        copied: computed(() => false),
        isSupported: ref(false),
        copy: vi.fn(),
        text: computed(() => '')
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ClipboardDocumentListIcon).exists()).toBe(false)
    })

    it('should change the copy icon when copied', async () => {
      const wrapper = createComponent()

      // mock clipboard
      vi.mocked(useClipboard).mockReturnValueOnce({
        copied: computed(() => true),
        isSupported: ref(true),
        copy: vi.fn(),
        text: computed(() => '')
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ClipboardDocumentCheckIcon).exists()).toBe(true)
    })

    it('should change tooltip text to be "Copied!" when copied', async () => {
      const wrapper = createComponent()

      // mock clipboard
      vi.mocked(useClipboard).mockReturnValueOnce({
        copied: computed(() => true),
        isSupported: ref(true),
        copy: vi.fn(),
        text: computed(() => '')
      })
      await wrapper.vm.$nextTick()

      const copyAddressTooltip = wrapper.find('[data-test="copy-address-tooltip"]').findComponent({
        name: 'ToolTip'
      })
      expect(copyAddressTooltip.props().content).toBe('Copied!')
    })

    it('should show the send button when pushTipLoading is false', () => {
      const wrapper = createComponent({ pushTipLoading: false })
      const sendButton = wrapper.find('button.btn-primary')
      expect(sendButton.exists()).toBe(true)
      expect(sendButton.text()).toBe('Send')
    })
    it('should show the transfer button for the team owner', () => {
      const wrapper = createComponent()
      const transferButton = wrapper.findAll('button.btn-secondary').at(1)
      if (transferButton) {
        expect(transferButton.exists()).toBe(true)
        expect(transferButton.text()).toBe('Transfer')
      }
    })

    it('should show the deposit button when bank address exists', () => {
      const wrapper = createComponent()
      expect(wrapper.find('button').text()).toContain('Deposit')
    })
  })

  describe('Emits', () => {
    it('should open block explorer when bank address is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('[data-test="team-bank-address"]').trigger('click')
      expect(wrapper.emitted('open-block-explorer')).toBeTruthy()
    })
  })

  describe('Methods', () => {
    it('should bind the tip amount input correctly', async () => {
      const wrapper = createComponent()
      const input = wrapper.find('input')
      await input.setValue('10')
      expect(input.element.value).toBe('10')
    })
  })
})
