import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import SafeAssetHoldings from '../SafeAssetHoldings.vue'
import { mockUseSafePortfolio } from '@/tests/mocks/safePortfolio.mock'
import { assetMetadata } from '@/utils/tokens/assets'

const address = '0x1111111111111111111111111111111111111111'
const token = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const asset = assetMetadata(token, 137, {
  address: token,
  name: 'Wrapped asset',
  symbol: 'AWETH',
  decimals: 18
})

describe('discovered Safe assets', () => {
  it('[AC-US-SAFE-003-10] renders the exact discovered currency, precision and unavailable valuation, and refreshes it', async () => {
    mockUseSafePortfolio.assets.data.value = [
      {
        asset,
        raw: 11371464599721321n,
        quantity: '0.011371464599721321',
        priceUsd: null,
        valueUsd: null
      },
      { asset, raw: 0n, quantity: '0', priceUsd: null, valueUsd: 0 }
    ]
    mockUseSafePortfolio.isIncomplete.value = true
    const wrapper = renderWithProviders(SafeAssetHoldings, { props: { address } })
    const table = wrapper.find('[data-test="safe-asset-table"]')
    expect(table.text()).toContain('AWETH')
    expect(table.text()).toContain(token)
    expect(table.text()).toContain('0.011371464599721321')
    expect(table.text()).toContain('Unavailable')
    expect(table.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.find('[data-test="safe-asset-valuation-warning"]').exists()).toBe(true)
    await wrapper.find('[data-test="refresh-safe-assets"]').trigger('click')
    expect(mockUseSafePortfolio.refetch).toHaveBeenCalledOnce()
  })
})
