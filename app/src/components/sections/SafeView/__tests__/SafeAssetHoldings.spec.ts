import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import SafeAssetHoldings from '../SafeAssetHoldings.vue'
import { mockUseSafePortfolio } from '@/tests/mocks/safePortfolio.mock'
import { assetMetadata } from '@/utils/tokens/assets'
import { SUPPORTED_TOKENS } from '@/constant'
import { makeTokenBalance, mockUseContractBalance } from '@/tests/mocks/composables.mock'
import AddressTooltip from '@/components/ui/AddressTooltip.vue'

const address = '0x1111111111111111111111111111111111111111'
const token = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const asset = assetMetadata(token, 137, {
  address: token,
  name: 'Wrapped asset',
  symbol: 'AWETH',
  decimals: 18
})

describe('Safe holdings', () => {
  beforeEach(() => {
    mockUseContractBalance.balances.value = SUPPORTED_TOKENS.map((token) =>
      makeTokenBalance({ token, amount: 0, usdPrice: 1 })
    )
  })

  it('keeps the three supported currencies in one table even when all balances are zero', () => {
    const wrapper = renderWithProviders(SafeAssetHoldings, { props: { address } })
    expect(wrapper.findAll('table')).toHaveLength(1)
    expect(wrapper.find('[data-test="safe-asset-table"]').findAll('tbody tr')).toHaveLength(3)
    for (const token of SUPPORTED_TOKENS) expect(wrapper.text()).toContain(`0 ${token.symbol}`)
    expect(wrapper.text()).not.toContain('Other Safe assets')
  })

  it('[AC-US-SAFE-003-10] renders the exact discovered currency, precision and unavailable valuation, and refreshes it', async () => {
    mockUseSafePortfolio.assets.data.value = [
      {
        asset,
        raw: 11371464599721321n,
        quantity: '0.011371464599721321',
        priceUsd: null,
        valueUsd: null
      },
      {
        asset: assetMetadata('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 137),
        raw: 0n,
        quantity: '0',
        priceUsd: null,
        valueUsd: 0
      }
    ]
    mockUseSafePortfolio.isIncomplete.value = true
    const wrapper = renderWithProviders(SafeAssetHoldings, { props: { address } })
    const table = wrapper.find('[data-test="safe-asset-table"]')
    expect(table.text()).toContain('AWETH')
    expect(
      wrapper.findAllComponents(AddressTooltip).map((item) => item.props('address'))
    ).toContain(token)
    expect(table.text()).toContain('0.011371464599721321')
    expect(table.text()).toContain('Price unavailable')
    expect(table.text()).toContain('Value unavailable')
    expect(table.findAll('tbody tr')).toHaveLength(4)
    expect(wrapper.find('[data-test="safe-asset-valuation-warning"]').exists()).toBe(true)
    await wrapper.find('[data-test="refresh-safe-assets"]').trigger('click')
    expect(mockUseSafePortfolio.refetch).toHaveBeenCalledOnce()
  })

  it('adds WETH after discovery and removes it when its balance returns to zero', async () => {
    const wrapper = renderWithProviders(SafeAssetHoldings, { props: { address } })
    const weth = {
      asset: { ...asset, name: 'Wrapped Ether', symbol: 'WETH' },
      raw: 10n ** 16n,
      quantity: '0.01',
      priceUsd: 2000,
      valueUsd: 20
    }
    mockUseSafePortfolio.assets.data.value = [weth]
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('0.01 WETH')
    expect(wrapper.text()).toContain('$20.00')
    mockUseSafePortfolio.assets.data.value = [{ ...weth, raw: 0n, quantity: '0', valueUsd: 0 }]
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('WETH')
    expect(wrapper.find('[data-test="safe-asset-table"]').findAll('tbody tr')).toHaveLength(3)
  })

  it('retains base currencies with unavailable balances while the first read is pending', () => {
    mockUseContractBalance.hasData.value = false
    mockUseContractBalance.isLoading.value = true
    const wrapper = renderWithProviders(SafeAssetHoldings, { props: { address } })
    const rows = wrapper.find('[data-test="safe-asset-table"]').findAll('tbody tr')
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(row.text()).toContain('Balance unavailable')
      expect(row.text()).toContain('Value unavailable')
      expect(row.text()).not.toContain('$0.00')
    }
  })
})
