import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { tokenHoldingRows } from '@/utils/tokens/holdings'
import { mockUseContractBalance } from '@/tests/mocks/composables.mock'
import TokenHoldingsSection from '@/components/ui/TokenHoldingsSection.vue'

describe('TokenHoldingsSection', () => {
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
