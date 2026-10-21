import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import { verifyCowFees } from '@/utils/safe/cowSettlement'
import { swapFeeEvidence, swapFeeFixture } from '@/utils/accounting/__tests__/swapFeeFixtures'
import SwapFeesDetails from '../SwapFeesDetails.vue'
import SafeSwapFeesSection from '../SafeSwapFeesSection.vue'
import { accountFor } from '@/utils/accounting/accountRegistry'
import { usd } from '@/utils/accounting/__tests__/fixtures'

describe('Executed swap fee display', () => {
  it('[AC-US-SAFE-002-13] shows the included total with closed details and separate network gas', async () => {
    const wrapper = renderWithProviders(SafeSwapFeesSection, {
      props: { swaps: [swapFeeEvidence()], journal: [], incomplete: false }
    })
    expect(wrapper.find('[data-test="swap-fee-total"]').text()).toContain('3.87 USDC')
    expect(wrapper.find('[data-test="swap-fee-withheld"]').text()).toBe(
      'Withheld from the WETH received: 0.194336 WETH arrived instead of 0.195758 WETH.'
    )
    expect(wrapper.text()).toContain('USDC → WETH')
    expect(wrapper.findAll('details[open]')).toHaveLength(0)
    const network = wrapper.find('[data-test="swap-network-fee"]')
    expect(network.text()).toContain('0.6559 POL')
    expect(network.text()).toContain('paid by the CoW solver')
    const details = wrapper.find('[data-test="swap-fee-breakdown-details"]')
    ;(details.element as HTMLDetailsElement).open = true
    await details.trigger('toggle')
    expect(wrapper.find('[data-test="swap-fee-breakdown"]').text()).toContain('Better-price fee')
    expect(wrapper.find('[data-test="swap-fee-breakdown"]').text()).toContain('0.00136994 WETH')
    expect(wrapper.find('[data-test="swap-fee-breakdown"]').text()).toContain('≈ 3.73 USDC')
    expect(wrapper.find('[data-test="swap-fee-breakdown-total"]').text()).toMatch(
      /0\.00142169 WETH\s+≈ 3\.87 USDC/
    )
    await wrapper.find('[data-test="swap-fee-precision"]').trigger('click')
    expect(wrapper.find('[data-test="swap-fee-precision"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-test="swap-fee-total"]').text()).toContain('3.870494 USDC')
    expect(wrapper.find('[data-test="swap-fee-breakdown"]').text()).toContain(
      '0.001369941633563023 WETH'
    )
    expect(network.text()).toContain('0.655884087128658992 POL')
    expect(network.text()).toContain('nothing is charged to your Safe')
    expect(network.find('[data-test="swap-network-payer"]').text()).toBe(
      swapFeeFixture().execution.networkFee!.payer
    )
    expect(wrapper.text()).toContain('They are not an extra charge')
    await wrapper.find('[data-test="swap-fee-precision"]').trigger('click')
    expect(wrapper.find('[data-test="swap-fee-total"]').text()).toContain('3.87 USDC')
  })
  it('shows loading, then failure with network gas preserved, and asks the owner to retry', async () => {
    const wrapper = renderWithProviders(SwapFeesDetails, {
      props: { swap: swapFeeEvidence(undefined, { loading: true }) }
    })
    expect(wrapper.find('[data-test="swap-fees-loading"]').exists()).toBe(true)
    await wrapper.setProps({ swap: swapFeeEvidence(undefined, { failed: true }) })
    expect(wrapper.find('[data-test="swap-fees-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="swap-fee-total"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="swap-network-exact-amount"]').text()).toBe(
      '0.655884087128658992 POL'
    )
    expect(wrapper.find('[data-test="swap-fee-precision"]').exists()).toBe(false)
    await wrapper.find('[data-test="retry-swap-fees"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
  it('states missing provider evidence explicitly and keeps unsupported swaps inspectable', () => {
    const fixture = swapFeeFixture()
    fixture.execution.cowTrades = []
    const wrapper = renderWithProviders(SwapFeesDetails, {
      props: { swap: swapFeeEvidence(fixture) }
    })
    expect(wrapper.find('[data-test="swap-fees-unavailable"]').text()).toContain('unavailable')
    expect(wrapper.find('[data-test="swap-fee-total"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="retry-swap-fees"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="swap-network-fee"]').exists()).toBe(true)
  })
  it('distinguishes gas paid by the Safe from unavailable network evidence', async () => {
    const fixture = swapFeeFixture()
    fixture.execution.networkFee!.payer = fixture.target.safeAddress.toUpperCase()
    const swap = swapFeeEvidence(fixture)
    const wrapper = renderWithProviders(SwapFeesDetails, { props: { swap } })
    const network = wrapper.find('[data-test="swap-network-fee"]')
    expect(network.text()).toContain('paid by your Safe')
    expect(network.text()).not.toContain('not an additional debit')
    await wrapper.setProps({
      swap: { ...swap, execution: { ...swap.execution!, networkFee: undefined } }
    })
    expect(network.text()).toContain('payer unavailable')
    expect(network.text()).toContain('Unavailable')
    expect(network.text()).not.toContain('paid by another wallet')
  })
  it('closes both disclosures and resets exact precision when the swap changes', async () => {
    const wrapper = renderWithProviders(SwapFeesDetails, { props: { swap: swapFeeEvidence() } })
    for (const details of wrapper.findAll('details')) {
      ;(details.element as HTMLDetailsElement).open = true
      await details.trigger('toggle')
    }
    await wrapper.find('[data-test="swap-fee-precision"]').trigger('click')
    expect(wrapper.findAll('details[open]')).toHaveLength(2)
    const fixture = swapFeeFixture()
    const hash = `0x${'c'.repeat(64)}`
    fixture.target.txHash = fixture.execution.transactionHash = fixture.trade.txHash = hash
    await wrapper.setProps({ swap: swapFeeEvidence(fixture) })
    expect(wrapper.findAll('details[open]')).toHaveLength(0)
    expect(wrapper.find('[data-test="swap-fee-precision"]').attributes('aria-pressed')).toBe(
      'false'
    )
    expect(wrapper.find('[data-test="swap-fee-total"]').text()).toContain('3.87 USDC')
  })
  it('paginates confirmed swap history and distinguishes empty from incomplete history', async () => {
    const swaps = Array.from({ length: 6 }, (_, i) => {
      const fixture = swapFeeFixture()
      fixture.target.txHash = `0x${String(i).padStart(64, '0')}`
      return swapFeeEvidence(fixture)
    })
    const wrapper = renderWithProviders(SafeSwapFeesSection, {
      props: { swaps, journal: [], incomplete: false }
    })
    expect(wrapper.findAll('[data-test="swap-fees-details"]')).toHaveLength(5)
    expect(wrapper.findAll('details[open]')).toHaveLength(0)
    await wrapper.find('[data-test="swap-fees-next"]').trigger('click')
    expect(wrapper.findAll('[data-test="swap-fees-details"]')).toHaveLength(1)
    await wrapper.setProps({ swaps: [], incomplete: true })
    expect(wrapper.find('[data-test="swap-fees-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="swap-fee-history-incomplete"]').exists()).toBe(true)
  })
  it('says how the swap was booked when the journal holds it', () => {
    const fixture = swapFeeFixture()
    const journal = {
      ...fixture.journal,
      lines: [
        ...fixture.journal.lines.map((line) =>
          line.debit !== undefined
            ? {
                ...line,
                debit: usd('529.073756'),
                movement: { ...line.movement!, valuationMethod: 'swap-consideration' as const }
              }
            : line
        ),
        { id: 'fee', account: accountFor('Transaction Fee Expense'), debit: usd('3.870494') }
      ]
    }
    const wrapper = renderWithProviders(SafeSwapFeesSection, {
      props: { swaps: [swapFeeEvidence(fixture)], journal: [journal], incomplete: false }
    })
    expect(wrapper.find('[data-test="swap-fee-booking"]').text()).toBe(
      'In the books: WETH cost $529.07 + swap fee $3.87.'
    )
  })
  it('forwards a retry from a swap to the page', async () => {
    const fixture = swapFeeFixture()
    const swap = {
      ...swapFeeEvidence(fixture),
      verification: verifyCowFees(fixture.target, fixture.execution, [], [])
    }
    const wrapper = renderWithProviders(SafeSwapFeesSection, {
      props: { swaps: [swap], journal: [], incomplete: false }
    })
    await wrapper.find('[data-test="retry-swap-fees"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
