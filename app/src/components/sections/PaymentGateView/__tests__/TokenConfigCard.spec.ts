import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TokenConfigCard from '../TokenConfigCard.vue'

describe('TokenConfigCard', () => {
  it('offers only USDC and USDCe — POL is never rendered', () => {
    const wrapper = mount(TokenConfigCard, { props: { selectedToken: 'USDC' } })
    const buttons = wrapper.findAll('[data-test="payment-gate-token-options"] button')

    expect(buttons.map((button) => button.text())).toEqual(['USDC', 'USDCe'])
  })

  it('highlights the currently selected token and leaves the other neutral', () => {
    const wrapper = mount(TokenConfigCard, { props: { selectedToken: 'USDCe' } })
    const [usdc, usdce] = wrapper.findAllComponents({ name: 'UButton' })

    expect(usdc.props('color')).toBe('neutral')
    expect(usdc.props('variant')).toBe('outline')
    expect(usdce.props('color')).toBe('primary')
    expect(usdce.props('variant')).toBe('solid')
  })

  it('emits update:selectedToken when a different token is clicked', async () => {
    const wrapper = mount(TokenConfigCard, { props: { selectedToken: 'USDC' } })
    const buttons = wrapper.findAll('[data-test="payment-gate-token-options"] button')

    await buttons[1].trigger('click')

    expect(wrapper.emitted('update:selectedToken')).toEqual([['USDCe']])
  })
})
