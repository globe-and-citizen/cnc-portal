import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'

describe('GenericTokenHoldingsSection', () => {
  it('renders table with a USDC row and correct values', () => {
    const wrapper = mount(GenericTokenHoldingsSection, {
      props: { address: '0x123' },
      global: {
        components: {
          TableComponent: { template: '<div class="table"><slot /></div>' },
          CardComponent: { template: '<div class="card"><slot /></div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Token Holding')
    expect(wrapper.text()).toContain('SepoliaETH')
    expect(wrapper.text()).toContain('0.5')
    expect(wrapper.text()).toContain('$1K')
  })
})
