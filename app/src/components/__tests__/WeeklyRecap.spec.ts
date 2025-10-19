import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WeeklyRecap from '@/components/WeeklyRecap.vue'
import type { WeeklyClaimResponse } from '@/types/cash-remuneration'

// Mock the currency store used by the component
const mockCurrencyStore = {
  getTokenInfo: vi.fn((id: string) => {
    if (id === 'native') return { symbol: 'NAT', prices: [{ id: 'local', price: 2 }] }
    return undefined
  }),
  localCurrency: { code: 'USD' }
}

vi.mock('@/stores', () => ({
  useCurrencyStore: () => mockCurrencyStore
}))

describe('WeeklyRecap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders totals and calculates amounts correctly', () => {
    // Build a fully-typed WeeklyClaim object to satisfy TypeScript
    type WeeklyClaim = WeeklyClaimResponse[number]

    const testWeeklyClaim: WeeklyClaim = {
      id: 1,
      status: 'signed',
      weekStart: '2025-10-13',
      data: { ownerAddress: '0xOwner' },
      memberAddress: '0xMember',
      teamId: 2,
      signature: null,
      wageId: 2,
      createdAt: '2025-10-13T00:00:00Z',
      updatedAt: '2025-10-13T00:00:00Z',
      wage: {
        id: 1,
        teamId: 1,
        userAddress: '0xMember',
        ratePerHour: [
          { type: 'native', amount: 5 },
          { type: 'native', amount: 3 }
        ],
        cashRatePerHour: 0,
        tokenRatePerHour: 0,
        usdcRatePerHour: 0,
        maximumHoursPerWeek: 40,
        nextWageId: null,
        createdAt: '2025-10-13T00:00:00Z',
        updatedAt: '2025-10-13T00:00:00Z'
      },
      claims: [
        {
          id: 1,
          status: 'signed',
          hoursWorked: 4,
          dayWorked: '2025-10-13',
          memo: '',
          signature: null,
          tokenTx: null,
          wageId: 2,
          weeklyClaimId: 1,
          createdAt: '2025-10-13T00:00:00Z',
          updatedAt: '2025-10-13T00:00:00Z'
        },
        {
          id: 2,
          status: 'signed',
          hoursWorked: 2,
          dayWorked: '2025-10-14',
          memo: '',
          signature: null,
          tokenTx: null,
          wageId: 2,
          weeklyClaimId: 1,
          createdAt: '2025-10-14T00:00:00Z',
          updatedAt: '2025-10-14T00:00:00Z'
        }
      ],
      member: { address: '0xMember', name: 'Alice', imageUrl: 'img' }
    }

    const wrapper = mount(WeeklyRecap, {
      props: { weeklyClaim: testWeeklyClaim }
    })

    expect(wrapper.text()).toContain('Total Hours')
    expect(wrapper.text()).toContain('6h')

    expect(wrapper.text()).toContain('Hourly Rate')
    expect(wrapper.html()).toContain('≃ $16.00 USD')

    expect(wrapper.text()).toContain('Total Amount')
    expect(wrapper.html()).toContain('≃ $96.00 USD')

    expect(wrapper.text()).toContain('of 40 hrs weekly limit')
  })
})
