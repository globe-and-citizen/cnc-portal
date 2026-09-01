import { vi } from 'vitest'
import { computed, ref } from 'vue'
import type { TokenConfig } from '@/constant'
import type { CurrencyPair, Money, TokenBalance } from '@/types'

const FALLBACK_TOKEN: TokenConfig = {
  id: 'native',
  name: 'Ether',
  symbol: 'ETH',
  code: 'ETH',
  coingeckoId: 'ethereum',
  decimals: 18,
  address: '0x0000000000000000000000000000000000000000'
}

const fixtureMoney = (value: number): Money => ({ value, formatted: `$${value}` })

/**
 * Build a `TokenBalance` fixture.
 *
 * Give it the amount and the unit prices — `raw` and the derived `value` side
 * are computed, so a spec can never leave them contradicting each other. Only
 * the fields a spec actually asserts on need overriding.
 */
export const makeTokenBalance = (
  input: {
    token?: Partial<TokenConfig>
    amount?: number
    raw?: bigint
    usdPrice?: number
    localPrice?: number
  } = {}
): TokenBalance => {
  const token = { ...FALLBACK_TOKEN, ...input.token }
  const amount = input.amount ?? 0
  const usdPrice = input.usdPrice ?? 0
  const localPrice = input.localPrice ?? usdPrice

  return {
    token,
    amount,
    raw: input.raw ?? BigInt(Math.round(amount * 10 ** token.decimals)),
    price: { usd: fixtureMoney(usdPrice), local: fixtureMoney(localPrice) },
    value: { usd: fixtureMoney(amount * usdPrice), local: fixtureMoney(amount * localPrice) }
  }
}

/**
 * Default builders for the contract-balance mock state. Exposed as functions so
 * that `resetComposableMocks()` can restore a FRESH copy on every test, even
 * after a spec has mutated `balances.value` / `total.value` in place.
 */
const defaultContractBalances = (): TokenBalance[] => [
  {
    amount: 0.5,
    raw: 500_000_000_000_000_000n,
    token: {
      id: 'native',
      name: 'SepoliaETH',
      symbol: 'SepoliaETH',
      code: 'SepoliaETH',
      coingeckoId: 'ethereum',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000'
    },
    price: { usd: { value: 1000, formatted: '$1K' }, local: { value: 1000, formatted: '$1K' } },
    value: { usd: { value: 500, formatted: '$500' }, local: { value: 500, formatted: '$500' } }
  },
  {
    amount: 50,
    raw: 50_000_000n,
    token: {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      coingeckoId: 'usd-coin',
      decimals: 6,
      address: '0xA3492D046095AFFE351cFac15de9b86425E235dB'
    },
    price: { usd: { value: 1000, formatted: '$1K' }, local: { value: 1000, formatted: '$1K' } },
    value: { usd: { value: 50000, formatted: '$50K' }, local: { value: 50000, formatted: '$50K' } }
  }
]

const defaultContractTotal = (): CurrencyPair => ({
  usd: { value: 50500, formatted: '$50.5K' },
  local: { value: 50500, formatted: '$50.5K' }
})

/**
 * Mock useContractBalance composable.
 *
 * The composable returns a TanStack query whose `data` holds `{ balances,
 * total }`. Specs steer it through the `balances` / `total` refs — `data` is
 * derived from them, so setting either one is picked up by the component under
 * test without rebuilding the whole payload.
 *
 * Set `hasData` to false to reproduce the pre-first-read state, where the real
 * composable leaves `data` undefined.
 */
const contractBalanceState = {
  balances: ref(defaultContractBalances()),
  total: ref(defaultContractTotal()),
  hasData: ref(true),
  isLoading: ref(false),
  error: ref(null),
  isFetching: ref(false),
  refetch: vi.fn()
}

export const mockUseContractBalance = {
  ...contractBalanceState,
  data: computed(() =>
    contractBalanceState.hasData.value
      ? {
          balances: contractBalanceState.balances.value,
          total: contractBalanceState.total.value
        }
      : undefined
  )
}

/**
 * Mock Apollo useQuery result
 */
export const mockUseApolloQuery = {
  result: ref(null),
  error: ref<Error | null>(null),
  loading: ref(false)
}

/**
 * Mock native transaction functions
 */
export const mockTransactionFunctions = {
  mockSendTransaction: vi.fn(),
  mockMutateAsync: vi.fn(),
  mockWaitForTransactionReceipt: vi.fn()
}

/**
 * Mock native transaction composable (TanStack mutation shape)
 */
export const mockUseSafeSendTransaction = {
  mutateAsync: mockTransactionFunctions.mockMutateAsync,
  mutate: mockTransactionFunctions.mockSendTransaction,
  isPending: ref(false),
  isSuccess: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref<{ hash: string; receipt: { status: string } } | null>(null),
  reset: vi.fn()
}

/**
 * Mock useBackendWake composable
 * Returns a function that does nothing - individual tests can override if needed
 */
export const mockUseBackendWake = vi.fn(() => {
  // No-op - just prevent the real implementation from being called
})

/**
 * Mock useAuth composable
 */
export const mockUseAuth = {
  logout: vi.fn(),
  login: vi.fn(),
  validateToken: vi.fn()
}

/**
 * Mock useClipboard composable from @vueuse/core
 */
export const mockUseClipboard = {
  copy: vi.fn(),
  copied: ref(false),
  isSupported: ref(true)
}

/**
 * Mock useFetch composable from @vueuse/core
 */
export const mockUseFetch = {
  post: {
    data: ref<{ accessToken: string | null }>({ accessToken: null }),
    error: ref<Error | null>(null),
    execute: vi.fn()
  },
  get: {
    url: ref(''),
    data: ref<unknown>(null),
    error: ref<Error | null>(null),
    execute: vi.fn()
  }
}

/**
 * Mock useBodAddAction composable
 */
export const mockUseBodAddAction = {
  addActionWrite: vi.fn(),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock useBodIsBodAction composable
 */
export const mockUseBodIsBodAction = {
  isBod: ref(false),
  isLoading: ref(false),
  error: ref(null)
}

/**
 * Mock useBlockTimestamp composable — the chain's own clock, reactive (unix seconds
 * as a bigint). Defaults to null (no block seen yet) so callers fall back to the
 * device clock, matching real behavior before the first block resolves. Tests that
 * care about the chain-time path (e.g. a deadline validated against block time)
 * should set `mockBlockTimestamp.value` directly.
 */
export const mockBlockTimestamp = ref<bigint | null>(null)

/**
 * Mock useSubmitRestriction composable
 */
export const mockUseSubmitRestriction = {
  isRestricted: ref(false),
  effectiveStatus: ref('enabled'),
  canSubmitAnytime: ref(true),
  checkRestriction: vi.fn().mockResolvedValue(false),
  errorMessage: ref(null)
}

/**
 * Reset function for composable mocks
 */
export const resetComposableMocks = () => {
  // Reset contract balance state (fresh copies so in-place mutations don't leak)
  mockUseContractBalance.balances.value = defaultContractBalances()
  mockUseContractBalance.total.value = defaultContractTotal()
  mockUseContractBalance.hasData.value = true
  mockUseContractBalance.isLoading.value = false
  mockUseContractBalance.error.value = null
  mockUseContractBalance.isFetching.value = false
  mockUseContractBalance.refetch.mockClear()

  // Reset native transaction states
  mockUseSafeSendTransaction.isPending.value = false
  mockUseSafeSendTransaction.isSuccess.value = false
  mockUseSafeSendTransaction.isError.value = false
  mockUseSafeSendTransaction.error.value = null
  mockUseSafeSendTransaction.data.value = null

  // Clear all native transaction function mocks
  Object.values(mockTransactionFunctions).forEach((mock) => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear()
    }
  })

  // Set default mock return values for transactions
  mockTransactionFunctions.mockSendTransaction.mockResolvedValue({ hash: '0xnativetx' })
  mockTransactionFunctions.mockMutateAsync.mockResolvedValue('0xtransfertx')
  mockTransactionFunctions.mockWaitForTransactionReceipt.mockResolvedValue({ status: 'success' })

  // Reset auth mock functions
  if (vi.isMockFunction(mockUseAuth.logout)) {
    mockUseAuth.logout.mockClear()
  }
  if (vi.isMockFunction(mockUseAuth.login)) {
    mockUseAuth.login.mockClear()
  }
  if (vi.isMockFunction(mockUseAuth.validateToken)) {
    mockUseAuth.validateToken.mockClear()
  }

  // Reset backend wake mock
  if (vi.isMockFunction(mockUseBackendWake)) {
    mockUseBackendWake.mockClear()
  }

  mockUseFetch.post.data.value = { accessToken: null }
  mockUseFetch.post.error.value = null
  if (vi.isMockFunction(mockUseFetch.post.execute)) {
    mockUseFetch.post.execute.mockClear()
  }
  mockUseFetch.get.url.value = ''
  mockUseFetch.get.data.value = null
  mockUseFetch.get.error.value = null
  if (vi.isMockFunction(mockUseFetch.get.execute)) {
    mockUseFetch.get.execute.mockClear()
  }

  // Reset clipboard mock
  mockUseClipboard.copied.value = false
  mockUseClipboard.isSupported.value = true
  if (vi.isMockFunction(mockUseClipboard.copy)) {
    mockUseClipboard.copy.mockClear()
  }

  mockUseBodAddAction.isLoading.value = false
  mockUseBodAddAction.error.value = null
  if (vi.isMockFunction(mockUseBodAddAction.addActionWrite)) {
    mockUseBodAddAction.addActionWrite.mockClear()
  }

  mockUseBodIsBodAction.isBod.value = false
  mockUseBodIsBodAction.isLoading.value = false
  mockUseBodIsBodAction.error.value = null

  // Reset block timestamp mock — no block seen yet, by default
  mockBlockTimestamp.value = null

  // Reset submit restriction mock
  mockUseSubmitRestriction.isRestricted.value = false
  mockUseSubmitRestriction.effectiveStatus.value = 'enabled'
  mockUseSubmitRestriction.canSubmitAnytime.value = true
  mockUseSubmitRestriction.errorMessage.value = null
  if (vi.isMockFunction(mockUseSubmitRestriction.checkRestriction)) {
    mockUseSubmitRestriction.checkRestriction.mockClear()
  }

  // Reset Apollo query mock
  mockUseApolloQuery.result.value = null
  mockUseApolloQuery.error.value = null
  mockUseApolloQuery.loading.value = false
}

// Keep for backwards compatibility
export const resetTransactionMocks = resetComposableMocks

/**
 * Stable TanStack-mutation mock. Specs drive the success path by replaying the
 * `onSuccess` callback captured on `mutate.mock.calls`, and the error path by
 * setting `error.value`.
 */
const createMutationStateMock = () => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(() => Promise.resolve(null)),
  isPending: ref(false),
  isError: ref(false),
  error: ref<Error | null>(null),
  data: ref<string | null>(null),
  reset: vi.fn()
})

const resetMutationStateMock = (state: ReturnType<typeof createMutationStateMock>) => {
  state.isPending.value = false
  state.isError.value = false
  state.error.value = null
  state.data.value = null
  state.mutate.mockReset()
  state.mutateAsync.mockReset()
  state.mutateAsync.mockResolvedValue(null)
  state.reset.mockClear()
}

/** useDeployContract (useContractFunctions.ts) — drives the deploy + register flow. */
export const mockDeployState = createMutationStateMock()
export const mockUseDeployContract = vi.fn(() => mockDeployState)
export const resetDeployState = () => resetMutationStateMock(mockDeployState)

/** useUploadFileMutation (file.queries.ts) — drives the image upload. */
export const mockUploadFileState = createMutationStateMock()
export const mockUseUploadFileMutation = vi.fn(() => mockUploadFileState)
export const resetUploadFileState = () => resetMutationStateMock(mockUploadFileState)

/**
 * Exported vi.fn() factory functions for TanStack Vue Query.
 * Use these in tests that need per-test configuration via mockReturnValue/mockReturnValueOnce.
 */
export const useQueryClientFn = vi.fn(() => ({
  invalidateQueries: vi.fn(async () => undefined),
  getQueryData: vi.fn(() => undefined),
  setQueryData: vi.fn(() => undefined),
  removeQueries: vi.fn(() => undefined)
}))

export const useQueryFn = vi.fn(() => ({
  data: vi.fn(),
  isLoading: vi.fn(),
  error: vi.fn()
}))

/**
 * Stable spy for `queryClient.invalidateQueries` — opt-in.
 *
 * The default `useQueryClientFn` returns a fresh `vi.fn()` per call, which is
 * fine for "was it called?" assertions but makes it impossible to inspect the
 * predicate / queryKey passed to `invalidateQueries`. Tests that need that
 * introspection should rebind in `beforeEach`:
 *
 *   useQueryClientFn.mockReturnValue({
 *     invalidateQueries: mockInvalidateQueries,
 *     getQueryData: vi.fn(),
 *     setQueryData: vi.fn(),
 *     removeQueries: vi.fn()
 *   })
 */
export const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined)

/**
 * Default mock for TanStack Vue Query's `useMutation`.
 *
 * Returns an inert mutation observer (mutate/mutateAsync are stub `vi.fn()`s,
 * status refs are idle). This matches the conservative behaviour the test
 * suite expected before V3 — no `mutationFn` runs unless a test opts in.
 *
 * For tests that DO want to exercise the real mutation lifecycle (mutationFn
 * / onSuccess / onError), swap in `smartUseMutation` per file:
 *
 *   beforeEach(() => useMutationFn.mockImplementation(smartUseMutation))
 */
export const useMutationFn = vi.fn(() => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: ref(false),
  isSuccess: ref(false),
  isError: ref(false),
  error: ref(null),
  data: ref(null),
  reset: vi.fn(),
  status: ref<'idle' | 'pending' | 'error' | 'success'>('idle'),
  variables: ref(undefined)
}))

type SmartMutationOptions<TData, TVariables> = {
  mutationFn: (vars: TVariables) => Promise<TData>
  onSuccess?: (data: TData, vars: TVariables, ctx: unknown) => unknown
  onError?: (err: unknown, vars: TVariables, ctx: unknown) => unknown
}

/**
 * Drop-in implementation for `useMutationFn` that actually runs `mutationFn`
 * and dispatches `onSuccess` / `onError` when `mutateAsync` is awaited.
 *
 * Use it via `useMutationFn.mockImplementation(smartUseMutation)` in tests
 * that exercise composables built on `useMutation` (e.g. V3 contract writes).
 *
 * Note: `mutate` is left as a no-op `vi.fn()` here because most existing
 * call sites only care about whether `mutate` was invoked, not its side
 * effects. Tests that need fire-and-forget behaviour can override.
 */
export const smartUseMutation = <TData, TVariables>(
  options: SmartMutationOptions<TData, TVariables>
) => ({
  mutate: vi.fn(),
  mutateAsync: async (variables: TVariables) => {
    try {
      const data = await options.mutationFn(variables)
      if (options.onSuccess) await options.onSuccess(data, variables, undefined)
      return data
    } catch (err) {
      if (options.onError) await options.onError(err, variables, undefined)
      throw err
    }
  },
  isPending: ref(false),
  isSuccess: ref(false),
  isError: ref(false),
  error: ref(null),
  data: ref(null),
  reset: vi.fn(),
  status: ref<'idle' | 'pending' | 'error' | 'success'>('idle')
})
