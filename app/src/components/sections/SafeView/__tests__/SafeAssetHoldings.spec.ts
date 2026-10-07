import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import SafeAssetHoldings from '../SafeAssetHoldings.vue'
import { mockUseSafePortfolio } from '@/tests/mocks/safePortfolio.mock'
import { assetMetadata } from '@/utils/tokens/assets'
import { SUPPORTED_TOKENS } from '@/constant'
import { makeTokenBalance, mockUseContractBalance } from '@/tests/mocks/composables.mock'
import TokenHoldingsSection from '@/components/ui/TokenHoldingsSection.vue'

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

  it('preserves the original titles, icons and currency labels while showing compact symbols', () => {
    mockUseContractBalance.balances.value = SUPPORTED_TOKENS.map((token) =>
      makeTokenBalance({ token, amount: 0.1, usdPrice: 1 })
    )
    const wrapper = renderWithProviders(SafeAssetHoldings, { props: { address } })
    const original = renderWithProviders(TokenHoldingsSection, { props: { address } })
    const table = wrapper.find('[data-test="safe-asset-table"]')
    expect(wrapper.text()).toContain('Token Holding')
    expect(table.findAll('thead th').map((cell) => cell.text())).toEqual([
      'RANK',
      'Token',
      'Amount',
      'Coin Price',
      'Balance'
    ])
    expect(table.findAll('[data-test="safe-holding-token"]').map((row) => row.text())).toEqual(
      SUPPORTED_TOKENS.map((token) =>
        token.symbol === 'POL' || token.symbol === 'ETH' || token.id !== 'native'
          ? token.symbol
          : `${token.symbol.charAt(0)}${token.symbol}`
      )
    )
    expect(table.text()).not.toContain('USD Coin')
    expect(
      table.findAll('tbody tr').map((row) =>
        row
          .findAll('td')
          .slice(2)
          .map((cell) => cell.text())
      )
    ).toEqual(
      original.findAll('tbody tr').map((row) =>
        row
          .findAll('td')
          .slice(2)
          .map((cell) => cell.text())
      )
    )
    expect(table.findAll('img').map((image) => image.attributes('src'))).toEqual(
      original.findAll('img').map((image) => image.attributes('src'))
    )
    expect(table.text()).toContain('$1 / USDC')
    expect(table.text()).not.toContain('$1.000000')
    expect(table.findAll('[data-test="safe-holding-token"]').map((cell) => cell.classes())).toEqual(
      original.findAll('tbody tr').map(() => ['flex', 'items-center', 'gap-2', 'lg:w-48'])
    )
    original.unmount()
  })

  it('[AC-US-SAFE-003-10] renders the exact discovered currency, precision and unavailable valuation', () => {
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
      wrapper
        .findAll('[data-test="safe-holding-token"]')
        .some((item) => item.attributes('title')?.includes(token))
    ).toBe(true)
    expect(table.text()).toContain('0.0114 AWETH')
    expect(table.findAll('[data-test="safe-holding-amount"]').at(-1)?.attributes('title')).toBe(
      '0.011371464599721321'
    )
    expect(table.text()).toContain('Price unavailable')
    expect(table.text()).toContain('Value unavailable')
    expect(table.findAll('tbody tr')).toHaveLength(4)
    expect(wrapper.find('[data-test="safe-asset-valuation-warning"]').exists()).toBe(true)
  })

  it('shows DAI with its token logo and a four-decimal amount, preserving the full quantity on hover', async () => {
    const logoUri = 'https://assets.example/dai.png'
    mockUseSafePortfolio.assets.data.value = [
      {
        asset: assetMetadata(token, 137, {
          address: token,
          name: 'Polygon PoS Bridged DAI',
          symbol: 'DAI',
          decimals: 18,
          logoUri
        }),
        raw: 286595379927822735n,
        quantity: '0.286595379927822735',
        priceUsd: 1,
        valueUsd: 0.286595379927822735
      }
    ]
    const wrapper = renderWithProviders(SafeAssetHoldings, { props: { address } })
    const row = wrapper.find('[data-test="safe-asset-table"]').findAll('tbody tr').at(-1)!
    expect(row.find('[data-test="safe-holding-token"]').text()).toBe('DAI')
    expect(row.text()).not.toContain('Polygon PoS Bridged DAI')
    expect(row.find('[data-test="safe-holding-amount"]').text()).toBe('0.2866 DAI')
    expect(row.find('[data-test="safe-holding-amount"]').attributes('title')).toBe(
      '0.286595379927822735'
    )
    expect(row.find('img').attributes('src')).toBe(logoUri)
    expect(row.find('img').attributes('alt')).toBe('DAI')
    await row.find('img').trigger('error')
    expect(row.find('img').exists()).toBe(false)
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
    expect(wrapper.text()).toContain('$20')
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
