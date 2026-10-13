import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, reactive, ref, toValue } from 'vue'
import { useContractBalance } from '@/composables/useContractBalance'
import { useGetSafeBalancesQuery } from '@/queries/safeClient.queries'
import { useCurrencyStore } from '@/stores'
import { mockTeamStore, mockUseContractBalance } from '@/tests/mocks'
import { mockUseSafeBalances } from '@/tests/mocks/safeBalances.mock'
import type { SafeClientBalances } from '@/types/safe'
import CompanyOverview from '../CompanyOverview.vue'

const BANK = '0x1111111111111111111111111111111111111111'
const EXPENSE = '0x5555555555555555555555555555555555555555'
const CASH = '0x6666666666666666666666666666666666666666'
const SAFE = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'

const holdings = (): SafeClientBalances => ({
  fiatTotal: '7.5',
  items: [
    {
      tokenInfo: {
        type: 'ERC20',
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        name: 'Dai',
        symbol: 'DAI',
        decimals: 18
      },
      balance: '2500000000000000000',
      fiatConversion: '1',
      fiatBalance: '2.5'
    },
    {
      tokenInfo: {
        type: 'ERC20',
        address: '0xcccccccccccccccccccccccccccccccccccccccc',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18
      },
      balance: '2500000000000000',
      fiatConversion: '2000',
      fiatBalance: '5'
    }
  ]
})

describe('CompanyOverview Safe valuation', () => {
  const currency = reactive({ code: 'USD', name: 'US Dollar', symbol: '$' })
  const safeData = ref<SafeClientBalances>()
  const safeLoading = ref(false)
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    currency.code = 'USD'
    currency.name = 'US Dollar'
    currency.symbol = '$'
    safeData.value = holdings()
    safeLoading.value = false
    vi.mocked(useCurrencyStore).mockReturnValue({ localCurrency: currency } as never)

    vi.mocked(useContractBalance).mockImplementation((address) => {
      const usd = { [BANK]: 10, [EXPENSE]: 2, [CASH]: 3 }[toValue(address) ?? ''] ?? 0
      const data = computed(() => {
        const local = currency.code === 'EUR' ? usd * 0.8 : usd
        return {
          balances: [],
          total: {
            usd: { value: usd, formatted: `$${usd}` },
            local: { value: local, formatted: `${currency.symbol}${local}` }
          }
        }
      })
      return { ...mockUseContractBalance, data } as ReturnType<typeof useContractBalance>
    })
    vi.mocked(useGetSafeBalancesQuery).mockReturnValue({
      ...mockUseSafeBalances.query(),
      data: safeData,
      isLoading: safeLoading
    } as ReturnType<typeof useGetSafeBalancesQuery>)
  })

  afterEach(() => wrapper?.unmount())

  const render = () => {
    wrapper = mount(CompanyOverview, { global: { stubs: { CashOutAllAction: true } } })
    return wrapper
  }
  const safeAmount = () =>
    wrapper!.get('[data-test="company-safe-account-card"] [data-test="account-balance"]').text()
  const totalAmount = () => wrapper!.get('[data-test="company-total-balance"]').text()

  it('includes DAI and WETH valuation in the Safe card and combined treasury total', () => {
    render()

    expect(safeAmount()).toBe('$7.5')
    expect(totalAmount()).toBe('$22.50')
    expect(
      wrapper!.get('[data-test="company-bank-account-card"] [data-test="account-balance"]').text()
    ).toBe('$10')
    expect(
      wrapper!
        .get('[data-test="company-expense-account-card"] [data-test="account-balance"]')
        .text()
    ).toBe('$2')
    expect(
      wrapper!
        .get('[data-test="company-payroll-account-card"] [data-test="account-balance"]')
        .text()
    ).toBe('$3')
    const { pathParams } = vi.mocked(useGetSafeBalancesQuery).mock.calls[0]![0]
    expect(toValue(pathParams.safeAddress)).toBe(SAFE)
    expect(toValue(pathParams.fiatCode)).toBe('USD')
  })

  it('updates both displayed totals when the shared Safe balance response changes', async () => {
    render()
    safeData.value = { ...holdings(), fiatTotal: '18' }
    await nextTick()

    expect(safeAmount()).toBe('$18')
    expect(totalAmount()).toBe('$33.00')
  })

  it('keeps every contribution in the selected currency when it changes', async () => {
    render()
    currency.code = 'EUR'
    currency.symbol = '€'
    safeData.value = { ...holdings(), fiatTotal: '6' }
    await nextTick()

    const { pathParams } = vi.mocked(useGetSafeBalancesQuery).mock.calls[0]![0]
    expect(toValue(pathParams.fiatCode)).toBe('EUR')
    expect(safeAmount()).toBe('€6')
    expect(totalAmount()).toBe('€18.00')
  })

  it('shows the existing loading placeholders while the Safe is loading', async () => {
    safeLoading.value = true
    render()

    expect(wrapper!.find('[data-test="company-total-loading"]').exists()).toBe(true)
    expect(
      wrapper!
        .find('[data-test="company-safe-account-card"] [data-test="account-balance-loading"]')
        .exists()
    ).toBe(true)
    expect(
      wrapper!.get('[data-test="company-bank-account-card"] [data-test="account-balance"]').text()
    ).toBe('$10')

    safeLoading.value = false
    await nextTick()
    expect(safeAmount()).toBe('$7.5')
    expect(totalAmount()).toBe('$22.50')
  })

  it('retains the provider valued total when another returned holding has no price', () => {
    const data = holdings()
    data.items.push({
      ...data.items[0]!,
      tokenInfo: { ...data.items[0]!.tokenInfo, symbol: 'UNKNOWN' },
      fiatConversion: null,
      fiatBalance: null
    })
    safeData.value = data
    render()

    expect(safeAmount()).toBe('$7.5')
    expect(totalAmount()).toBe('$22.50')
  })

  it('keeps a numeric zero for an empty Safe', () => {
    safeData.value = { fiatTotal: '0', items: [] }
    render()

    expect(safeAmount()).toBe('$0')
    expect(totalAmount()).toBe('$15.00')
  })

  it('keeps the other contributions when no Safe is registered', () => {
    const addressOf = mockTeamStore.getContractAddressByType.getMockImplementation()!
    mockTeamStore.getContractAddressByType.mockImplementation((type) =>
      type === 'Safe' ? (undefined as never) : addressOf(type)
    )
    safeData.value = undefined
    render()

    expect(safeAmount()).toBe('$0')
    expect(totalAmount()).toBe('$15.00')
    expect(wrapper!.text()).not.toContain('unavailable')
    const { pathParams } = vi.mocked(useGetSafeBalancesQuery).mock.calls[0]![0]
    expect(toValue(pathParams.safeAddress)).toBeUndefined()
  })

  it.each(['invalid', '-1', 'Infinity'])(
    'keeps numeric totals for an invalid provider total %s',
    (fiatTotal) => {
      safeData.value = { ...holdings(), fiatTotal }
      render()

      expect(safeAmount()).toBe('$0')
      expect(totalAmount()).toBe('$15.00')
    }
  )
})
