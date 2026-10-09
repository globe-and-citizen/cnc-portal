import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import { mockUseSafeBalances } from '@/tests/mocks/safeBalances.mock'
import { assetMetadata } from '@/utils/tokens/assets'
import { SUPPORTED_TOKENS } from '@/constant'
import { makeTokenBalance, mockUseContractBalance } from '@/tests/mocks/composables.mock'
import TokenHoldingsSection from '@/components/ui/TokenHoldingsSection.vue'
import { safePortfolioRows } from '@/utils/safe/portfolio'
import { tokenHoldingRows } from '@/utils/tokens/holdings'

const token = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const asset = assetMetadata(token, 137, {
  address: token,
  name: 'Wrapped asset',
  symbol: 'AWETH',
  decimals: 18
})

const rows = () => safePortfolioRows(mockUseSafeBalances.query().data.value)
const renderHoldings = () =>
  renderWithProviders(TokenHoldingsSection, {
    props: {
      rows: rows(),
      isLoading: mockUseSafeBalances.isLoading.value,
      isIncomplete: mockUseSafeBalances.isIncomplete.value,
      compact: true
    }
  })

describe('Safe holdings', () => {
  beforeEach(() => {
    mockUseContractBalance.balances.value = SUPPORTED_TOKENS.map((token) =>
      makeTokenBalance({ token, amount: 0, usdPrice: 1 })
    )
  })

  it('renders the three zero-balance tokens when they are present in the response', () => {
    const wrapper = renderHoldings()
    expect(wrapper.findAll('table')).toHaveLength(1)
    expect(wrapper.find('[data-test="safe-asset-table"]').findAll('tbody tr')).toHaveLength(3)
    for (const token of SUPPORTED_TOKENS) expect(wrapper.text()).toContain(`0 ${token.symbol}`)
    expect(wrapper.text()).not.toContain('Other Safe assets')
  })

  it('preserves the table titles and currency labels while showing provider token symbols', () => {
    mockUseContractBalance.balances.value = SUPPORTED_TOKENS.map((token) =>
      makeTokenBalance({ token, amount: 0.1, usdPrice: 1 })
    )
    const wrapper = renderHoldings()
    const original = renderWithProviders(TokenHoldingsSection, {
      props: { rows: tokenHoldingRows(mockUseContractBalance.data.value) }
    })
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
      SUPPORTED_TOKENS.map((token) => `${token.symbol.charAt(0)}${token.symbol}`)
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
    expect(table.findAll('img')).toHaveLength(0)
    expect(table.text()).toContain('$1 / USDC')
    expect(table.text()).not.toContain('$1.000000')
    expect(table.findAll('[data-test="safe-holding-token"]').map((cell) => cell.classes())).toEqual(
      original.findAll('tbody tr').map(() => ['flex', 'items-center', 'gap-2', 'lg:w-48'])
    )
    original.unmount()
  })

  it('[AC-US-SAFE-003-10] renders the exact discovered currency, precision and unavailable valuation', () => {
    mockUseSafeBalances.assets.data.value = [
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
    mockUseSafeBalances.isIncomplete.value = true
    const wrapper = renderHoldings()
    const table = wrapper.find('[data-test="safe-asset-table"]')
    expect(table.text()).toContain('AWETH')
    expect(
      wrapper
        .findAll('[data-test="safe-holding-token"]')
        .some((item) => item.attributes('title')?.includes(token))
    ).toBe(true)
    expect(table.text()).toContain('0.0114 AWETH')
    expect(table.findAll('[data-test="safe-holding-amount"]').at(-2)?.attributes('title')).toBe(
      '0.011371464599721321'
    )
    expect(table.text()).toContain('Price unavailable')
    expect(table.text()).toContain('Value unavailable')
    expect(table.findAll('tbody tr')).toHaveLength(5)
    expect(wrapper.find('[data-test="safe-asset-valuation-warning"]').exists()).toBe(true)
  })

  it('shows DAI with its token logo and a four-decimal amount, preserving the full quantity on hover', async () => {
    const logoUri = 'https://assets.example/dai.png'
    mockUseSafeBalances.assets.data.value = [
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
    const wrapper = renderHoldings()
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

  it('keeps a returned WETH balance at zero and removes it only when absent from the response', async () => {
    const wrapper = renderHoldings()
    const weth = {
      asset: { ...asset, name: 'Wrapped Ether', symbol: 'WETH' },
      raw: 10n ** 16n,
      quantity: '0.01',
      priceUsd: 2000,
      valueUsd: 20
    }
    mockUseSafeBalances.assets.data.value = [weth]
    await wrapper.setProps({ rows: rows() })
    expect(wrapper.text()).toContain('0.01 WETH')
    expect(wrapper.text()).toContain('$20')
    mockUseSafeBalances.assets.data.value = [{ ...weth, raw: 0n, quantity: '0', valueUsd: 0 }]
    await wrapper.setProps({ rows: rows() })
    expect(wrapper.text()).toContain('0 WETH')
    expect(wrapper.find('[data-test="safe-asset-table"]').findAll('tbody tr')).toHaveLength(4)
    mockUseSafeBalances.assets.data.value = []
    await wrapper.setProps({ rows: rows() })
    expect(wrapper.text()).not.toContain('WETH')
    expect(wrapper.find('[data-test="safe-asset-table"]').findAll('tbody tr')).toHaveLength(3)
  })

  it('does not invent token rows while the first response is pending', () => {
    mockUseContractBalance.hasData.value = false
    mockUseContractBalance.isLoading.value = true
    const wrapper = renderHoldings()
    expect(rows()).toEqual([])
    expect(wrapper.find('[data-test="safe-asset-table"]').text()).not.toContain('USDC')
  })

  it('renders no holdings when the Gateway returns an empty list', () => {
    mockUseContractBalance.balances.value = []
    const wrapper = renderHoldings()
    expect(rows()).toEqual([])
    expect(wrapper.text()).not.toContain('USDC')
  })
})
