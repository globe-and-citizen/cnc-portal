import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { tokenHoldingRows } from '@/utils/tokens/holdings'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'
import TokenHoldingsSection from '@/components/ui/TokenHoldingsSection.vue'

describe('TokenHoldingsSection', () => {
  it('shows a balance-loading error instead of suggesting missing asset prices', async () => {
    const wrapper = mount(TokenHoldingsSection, {
      props: { rows: [], hasError: true, isIncomplete: true }
    })

    expect(wrapper.get('[data-test="safe-asset-load-error"]').text()).toContain(
      'Asset balances could not be loaded'
    )
    expect(wrapper.find('[data-test="safe-asset-valuation-warning"]').exists()).toBe(false)

    await wrapper.setProps({ hasError: false })
    expect(wrapper.find('[data-test="safe-asset-load-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="safe-asset-valuation-warning"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('lists unrecognized tokens apart by contract without showing their self-declared name', () => {
    const [row] = tokenHoldingRows(mockUseContractBalance.data.value)
    const airdrop = {
      ...row!,
      name: 'Claim your SHIB reward',
      token: { name: 'Claim your SHIB reward', symbol: 'SWAP ✅ t .me/s/sol_shiba' },
      address: '0x7525A2c3E099F451830E31684736bB1B92C16D34',
      quantity: '1'
    }
    const wrapper = mount(TokenHoldingsSection, {
      props: { rows: [], unrecognizedRows: [airdrop] }
    })

    const section = wrapper.get('[data-test="safe-unrecognized-assets"]')
    expect(section.text()).toContain('Unrecognized tokens (1)')
    expect(section.text()).toContain(airdrop.address)
    expect(section.text()).not.toContain('sol_shiba')
    expect(wrapper.find('[data-test="safe-asset-valuation-warning"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders table with a USDC row and correct values', () => {
    const wrapper = mount(TokenHoldingsSection, {
      props: { rows: tokenHoldingRows(mockUseContractBalance.data.value) },
      global: {
        components: {
          TableComponent: { template: '<div class="table"><slot /></div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Token Holding')
    expect(wrapper.text()).toContain('SepoliaETH')
    expect(wrapper.text()).toContain('0.5')
    expect(wrapper.text()).toContain('$1K')
  })
})
