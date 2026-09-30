import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import InvestorsHeader from '../InvestorsHeader.vue'
import { parseUnits } from 'viem'
import {
  mockInvestorReads,
  mockTeamStore,
  mockToast,
  mockUserStore,
  renderWithProviders
} from '@/tests/mocks'
import { log } from '@/lib/logging'
import { EMPTY_VALUE } from '@/utils/format'

describe('[US-SHER-003] InvestorsHeader', () => {
  let wrapper: ReturnType<typeof createComponent>

  // Test data constants
  const mockTokenData = {
    symbol: 'BTC',
    totalSupply: parseUnits('1000000', 6),
    balance: parseUnits('100', 6),
    shareholders: ['0x123', '0x456']
  }

  // Test selectors
  const SELECTORS = {
    overviewCards: '.overview-card',
    amount: '[data-test="amount"]',
    subtitle: '[data-test="subtitle"]',
    loading: '[data-test="loading"]'
  } as const

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useToast', () => mockToast)

    // Initialize store state
    mockTeamStore.currentTeam = {
      id: 1,
      name: 'Test Team',
      ownerAddress: '0x123'
    }
    mockUserStore.address = '0xUser123'

    mockInvestorReads.symbol.data.value = mockTokenData.symbol
    mockInvestorReads.totalSupply.data.value = mockTokenData.totalSupply
    mockInvestorReads.balanceOf.data.value = mockTokenData.balance
    mockInvestorReads.shareholders.data.value = mockTokenData.shareholders
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  const createComponent = () => {
    return renderWithProviders(InvestorsHeader, {
      global: {
        stubs: {
          OverviewCard: {
            template: `
              <div class="overview-card">
                <div v-if="!loading" data-test="amount">{{ title }}</div>
                <div v-else data-test="loading">Loading...</div>
                <div data-test="subtitle">{{ subtitle }}</div>
              </div>
            `,
            props: ['title', 'subtitle', 'variant', 'cardIcon', 'loading']
          }
        }
      }
    })
  }

  describe('Component Rendering', () => {
    it('renders the component with all required elements', () => {
      wrapper = createComponent()

      const overviewCards = wrapper.findAll(SELECTORS.overviewCards)
      expect(overviewCards).toHaveLength(3)
    })

    it('renders investors count card with correct data', () => {
      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const investorsCard = cards[0]

      expect(investorsCard.find(SELECTORS.amount).text()).toBe('2 Investors')
      expect(investorsCard.find(SELECTORS.subtitle).text()).toBe('Investors')
    })

    it('renders balance card with formatted token amount', () => {
      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const balanceCard = cards[1]

      expect(balanceCard.find(SELECTORS.amount).text()).toBe('100 BTC')
      expect(balanceCard.find(SELECTORS.subtitle).text()).toBe('Your Balance')
    })

    it('renders total supply card with formatted token amount', () => {
      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const supplyCard = cards[2]

      expect(supplyCard.find(SELECTORS.amount).text()).toBe('1000000 BTC')
      expect(supplyCard.find(SELECTORS.subtitle).text()).toBe('Total Supply')
    })
  })

  describe('Loading States', () => {
    it('shows loading state when team is not available', () => {
      mockTeamStore.currentTeam = null
      wrapper = createComponent()

      const overviewCards = wrapper.findAll(SELECTORS.overviewCards)
      expect(overviewCards).toHaveLength(3)
    })

    it('[AC-US-SHER-003-08] shows unavailable values for a missing token symbol', () => {
      mockInvestorReads.symbol.data.value = ' '

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)

      expect(cards[1].find(SELECTORS.amount).text()).toBe(EMPTY_VALUE)
      expect(cards[2].find(SELECTORS.amount).text()).toBe(EMPTY_VALUE)
    })

    it('[AC-US-SHER-003-06] shows unavailable values for missing balance and supply', () => {
      mockInvestorReads.balanceOf.data.value = null
      mockInvestorReads.totalSupply.data.value = undefined

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)

      expect(cards[1].find(SELECTORS.amount).text()).toBe(EMPTY_VALUE)
      expect(cards[2].find(SELECTORS.amount).text()).toBe(EMPTY_VALUE)
    })
  })

  describe('Edge Cases and Data Validation', () => {
    it('[AC-US-SHER-003-05] distinguishes an empty shareholder list', () => {
      mockInvestorReads.shareholders.data.value = []

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const investorsCard = cards[0]

      expect(investorsCard.find(SELECTORS.amount).text()).toBe('0 Investors')
    })

    it('handles null shareholders data', () => {
      mockInvestorReads.shareholders.data.value = null

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const investorsCard = cards[0]

      expect(investorsCard.find(SELECTORS.amount).text()).toBe('0 Investors')
    })

    it('displays zero investors for a zero token balance', () => {
      mockInvestorReads.balanceOf.data.value = parseUnits('0', 6)

      wrapper = createComponent()
      const cards = wrapper.findAll(SELECTORS.overviewCards)
      const balanceCard = cards[1]

      expect(balanceCard.find(SELECTORS.amount).text()).toBe('0 BTC')
    })

    it('[AC-US-SHER-003-07] reports a shareholder read failure without replacing known values', async () => {
      const logErrorSpy = vi.spyOn(log, 'error')
      wrapper = createComponent()

      mockInvestorReads.shareholders.error.value = new Error('shareholder read failed')
      await wrapper.vm.$nextTick()

      expect(wrapper.findAll(SELECTORS.overviewCards)[0].find(SELECTORS.amount).text()).toBe(
        '2 Investors'
      )
      expect(logErrorSpy).toHaveBeenCalledWith(
        'Error fetching shareholders',
        mockInvestorReads.shareholders.error.value
      )
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Error fetching shareholders',
        color: 'error'
      })
    })
  })
})
