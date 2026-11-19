import { describe, expect, it } from 'vitest'
import TokenHoldingsSection from '@/components/ui/TokenHoldingsSection.vue'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'
import { mount } from '@vue/test-utils'
import { tokenHoldingRows } from '@/utils/tokens/holdings'

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
