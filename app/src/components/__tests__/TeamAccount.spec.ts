import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import TeamAccount from '@/components/TeamAccount.vue'
import { NETWORK } from '@/constant'

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'
  }))
}))

describe('TeamAccount', () => {
  const createComponent = (props?: any) => {
    return mount(TeamAccount, {
      props: {
        team: {
          bankAddress: '0xd6307a4B12661a5254CEbB67eFA869E37d0421E6',
          ownerAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
          ...props?.team
        },
        teamBalance: 100,
        pushTipLoading: false,
        sendTipLoading: false,
        balanceLoading: false,
        ...props
      }
    })
  }
  describe('Render', () => {
    it('should display the team balance correctly', () => {
      const wrapper = createComponent()
      expect(wrapper.find('.stat-value').text()).toContain('100')
      expect(wrapper.find('.stat-value').text()).toContain(NETWORK.currencySymbol)
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
    it('should show balance loading indicator when balance is loading', () => {
      const wrapper = createComponent({ balanceLoading: true })
      expect(wrapper.find('[data-test="balance-loading"]').exists()).toBe(true)
    })

    it('should show the deposit button when bank address exists', () => {
      const wrapper = createComponent()
      expect(wrapper.find('button').text()).toContain('Deposit')
    })
    it('should show the loading button when pushTipLoading is true', () => {
      const wrapper = createComponent({ pushTipLoading: true })
      expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    })
  })
  describe('Emits', () => {
    it('should emit the transfer event when transfer button is clicked', async () => {
      const wrapper = createComponent()
      const transferButton = wrapper.findAll('button.btn-secondary').at(1)
      if (transferButton) {
        await transferButton.trigger('click')
        expect(wrapper.emitted('transfer')).toBeTruthy()
      }
    })

    it('should emit the pushTip event with the correct amount when send button is clicked', async () => {
      const wrapper = createComponent()
      const input = wrapper.find('input')
      await input.setValue('10')
      const sendButton = wrapper.find('button.btn-primary')
      await sendButton.trigger('click')
      expect(wrapper.emitted('pushTip')).toBeTruthy()
      expect((wrapper as any).emitted('pushTip')[0]).toEqual(['10'])
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
