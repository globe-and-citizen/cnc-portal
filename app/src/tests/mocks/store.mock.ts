import { mockTeamData } from '@/tests/mocks/index'
import type { ContractType } from '@/types/teamContract'
import { vi } from 'vitest'
import { ref } from 'vue'
const teamStoreDataDefaults = () => ({
  currentTeam: mockTeamData,
  currentTeamId: mockTeamData.id,
  currentTeamMeta: {
    isPending: false,
    data: mockTeamData
  }
})

const defaultGetContractAddressByType = (type: ContractType) => {
  const contractAddresses = {
    Bank: '0x1111111111111111111111111111111111111111',
    InvestorV1: '0x2222222222222222222222222222222222222222',
    Voting: '0x3333333333333333333333333333333333333333',
    BoardOfDirectors: '0x4444444444444444444444444444444444444444',
    ExpenseAccountEIP712: '0x5555555555555555555555555555555555555555',
    CashRemunerationEIP712: '0x6666666666666666666666666666666666666666',
    Campaign: '0x7777777777777777777777777777777777777777',
    Elections: '0x8888888888888888888888888888888888888888',
    Proposals: '0x9999999999999999999999999999999999999999',
    Vesting: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    SafeDepositRouter: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    Safe: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    FixedReturn: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'
  }
  return contractAddresses[type] || '0x1234567890123456789012345678901234567890'
}

/**
 * Build a fully independent team-store mock (fresh data + fresh spies).
 * Use when a spec needs its own isolated store instance.
 */
export const makeTeamStore = (overrides: Record<string, unknown> = {}) => {
  const store = {
    ...teamStoreDataDefaults(),
    teamsMeta: {
      reloadTeams: vi.fn()
    },
    setCurrentTeamId: vi.fn((id: string) => {
      store.currentTeamId = id
    }),
    getContractAddressByType: vi.fn(defaultGetContractAddressByType),
    fetchTeam: vi.fn(),
    ...overrides
  }
  return store
}

/**
 * Shared instance returned by the globally-mocked `useTeamStore`.
 * Specs set up state by mutating it directly (e.g. `mockTeamStore.currentTeamId = '1'`);
 * `resetTeamStoreMock()` (called in a global `beforeEach`) restores defaults — including
 * the default `getContractAddressByType`, which several specs replace with their own spy —
 * so mutations never leak across tests.
 */
export const mockTeamStore = makeTeamStore()

export const resetTeamStoreMock = () => {
  Object.assign(mockTeamStore, teamStoreDataDefaults())
  mockTeamStore.getContractAddressByType = vi.fn(defaultGetContractAddressByType)
  mockTeamStore.setCurrentTeamId.mockClear()
  mockTeamStore.fetchTeam.mockClear()
  mockTeamStore.teamsMeta.reloadTeams.mockClear()
}

export const mockToast = {
  add: vi.fn()
}

interface UserStoreData {
  address: string
  name: string
  nonce: string
  imageUrl: string
  isAuth: boolean
}

const userStoreDataDefaults = (): UserStoreData => ({
  address: '0x0000000000000000000000000000000000000001',
  name: 'Test User',
  nonce: '',
  imageUrl: 'https://example.com/avatar.jpg',
  isAuth: true
})

/**
 * Build a fully independent user-store mock (fresh data + fresh spies).
 * Use when a spec needs its own isolated store instance.
 */
export const makeUserStore = (overrides: Partial<UserStoreData> = {}) => ({
  ...userStoreDataDefaults(),
  ...overrides,
  setUserData: vi.fn(),
  clearUserData: vi.fn(),
  setAuthStatus: vi.fn()
})

/**
 * Shared instance returned by the globally-mocked `useUserDataStore`.
 * Specs set up state by mutating it directly (e.g. `mockUserStore.address = '0x…'`);
 * `resetUserStoreMock()` (called in a global `beforeEach`) restores defaults so
 * mutations never leak across tests.
 */
export const mockUserStore = makeUserStore()

export const resetUserStoreMock = () => {
  Object.assign(mockUserStore, userStoreDataDefaults())
  mockUserStore.setUserData.mockClear()
  mockUserStore.clearUserData.mockClear()
  mockUserStore.setAuthStatus.mockClear()
}

export const mockUseCurrencyStore = () => ({
  nativeToken: ref({
    priceInUSD: 1.5
  }),
  localCurrency: ref({
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  }),
  supportedTokens: [
    {
      id: 'native',
      name: 'SepoliaETH',
      symbol: 'SepoliaETH',
      code: 'ETH',
      coingeckoId: 'ethereum',
      decimals: 18,
      address: '0xNative'
    },
    {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      coingeckoId: 'usd-coin',
      decimals: 6,
      address: '0xUSDC'
    }
  ],
  tokenStates: [
    {
      id: 'native',
      data: ref({
        market_data: {
          current_price: { usd: 2000, cad: 2500, eur: 1800, idr: 30000000, inr: 150000 }
        }
      }),
      loading: ref(false)
    },
    {
      id: 'usdc',
      data: ref({
        market_data: { current_price: { usd: 1, cad: 1.3, eur: 0.9, idr: 15000, inr: 80 } }
      }),
      loading: ref(false)
    }
  ],
  getTokenInfo: vi.fn((tokenId) => ({
    id: tokenId,
    name: tokenId === 'native' ? 'SepoliaETH' : 'USD Coin',
    symbol: tokenId === 'native' ? 'SepoliaETH' : 'USDC',
    code: tokenId === 'native' ? 'ETH' : 'USDC',
    prices: [
      { id: 'local', price: tokenId === 'native' ? 2000 : 1, code: 'USD', symbol: '$' },
      { id: 'usd', price: tokenId === 'native' ? 2000 : 1, code: 'USD', symbol: '$' }
    ]
  })),
  getTokenPrice: vi.fn(
    (tokenId: 'native' | 'usdc', local: boolean = true, currencyCode: string = 'usd') => {
      const prices: Record<'native' | 'usdc', { usd: number; eur: number; cad: number }> = {
        native: { usd: 2000, eur: 1800, cad: 2500 },
        usdc: { usd: 1, eur: 0.9, cad: 1.3 }
      }
      const token = prices[tokenId] || { usd: 0, eur: 0, cad: 0 }
      if (local) return token.usd
      const key = currencyCode?.toLowerCase?.() as 'usd' | 'eur' | 'cad'
      return token[key] ?? 0
    }
  ),
  isTokenLoading: vi.fn(() => false),
  setCurrency: vi.fn()
})

export const makeCurrencyStoreMock = (
  overrides: Partial<{
    localCurrency: { code: string; name?: string; symbol?: string }
    supportedTokens: Array<{
      id: string
      symbol: string
      address: string
      name?: string
      code?: string
      coingeckoId?: string
      decimals?: number
    }>
    getTokenPrice: ReturnType<typeof vi.fn>
  }> = {}
) => ({
  localCurrency: { code: 'USD', name: 'US Dollar', symbol: '$' },
  supportedTokens: [
    { id: 'native', symbol: 'ETH', address: '0x0000000000000000000000000000000000000000' },
    { id: 'usdc', symbol: 'USDC', address: '0xa3492d046095affe351cfac15de9b86425e235db' }
  ],
  getTokenPrice: vi.fn(() => 1),
  ...overrides
})
