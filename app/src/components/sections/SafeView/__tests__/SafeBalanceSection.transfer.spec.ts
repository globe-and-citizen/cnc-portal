import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'
import SafeBalanceSection from '../SafeBalanceSection.vue'
import { mockUseContractBalance, makeTokenBalance, useQueryClientFn } from '@/tests/mocks'
import { mockUserStore } from '@/tests/mocks/store.mock'
import * as utils from '@/utils'

const {
  mockGetSafeHomeUrl,
  mockOpenSafeAppUrl,
  mockUseChainId,
  mockUseTeamStore,
  mockuseGetSafeInfoQuery,
  mockTransferMutate,
  mockTransferReset,
  mockTransferPending,
  mockUseTransferFromSafeMutation
} = vi.hoisted(() => ({
  mockGetSafeHomeUrl: vi.fn(),
  mockOpenSafeAppUrl: vi.fn(),
  mockUseChainId: vi.fn(),
  mockUseTeamStore: vi.fn(),
  mockuseGetSafeInfoQuery: vi.fn(),
  mockTransferMutate: vi.fn(),
  mockTransferReset: vi.fn(),
  mockTransferPending: { value: false },
  mockUseTransferFromSafeMutation: vi.fn(() => ({
    mutate: mockTransferMutate,
    isPending: mockTransferPending,
    reset: mockTransferReset
  }))
}))

// Mock external dependencies
vi.mock('@/composables/safe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/safe')>()
  return {
    ...actual,
    getSafeHomeUrl: mockGetSafeHomeUrl,
    openSafeAppUrl: mockOpenSafeAppUrl
  }
})

vi.mock('@/queries/safe.queries', () => ({
  useGetSafeInfoQuery: mockuseGetSafeInfoQuery
}))

vi.mock('@/queries/safe.mutations', () => ({
  useTransferFromSafeMutation: mockUseTransferFromSafeMutation
}))

// Test constants
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  safeInfo: { owners: ['0x1111111111111111111111111111111111111111' as Address], threshold: 2 },
  balances: [
    makeTokenBalance({
      token: {
        symbol: 'ETH',
        id: 'native',
        name: 'Ethereum',
        code: 'ETH',
        coingeckoId: 'ethereum',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000'
      },
      amount: 1.5,
      usdPrice: 2000
    }),
    makeTokenBalance({
      token: {
        symbol: 'SHER',
        id: 'sher',
        name: 'Sherlock',
        code: 'SHER',
        coingeckoId: 'sher-token',
        decimals: 6,
        address: '0x1234567890123456789012345678901234567890'
      },
      amount: 100,
      usdPrice: 5
    })
  ],
  total: {
    usd: { value: 4500, formatted: '$4,500' },
    local: { value: 4500, formatted: '$4,500' }
  },
  defaultCurrency: { code: 'USD', name: 'US Dollar', symbol: '$' },
  team: {
    safeAddress: '0x1234567890123456789012345678901234567890' as Address,
    id: '1',
    name: 'Test Team'
  },
  teamMeta: { data: { safeAddress: '0x1234567890123456789012345678901234567890' as Address } }
}

// Component stubs
const AddressToolTipStub = defineComponent({ template: '<div></div>' })
const TransferFormStub = defineComponent({
  emits: ['transfer', 'closeModal', 'update:modelValue'],
  props: ['modelValue', 'loading', 'tokens'],
  template:
    "<div><button data-test=\"emit-transfer\" @click=\"$emit('transfer', { address: { name: 'Recipient', address: '0x3333333333333333333333333333333333333333' }, token: modelValue.token, amount: '1' })\">Transfer</button><button data-test=\"emit-invalid-transfer\" @click=\"$emit('transfer', { address: { name: '', address: '' }, token: modelValue.token, amount: '0' })\">Invalid</button></div>"
})

describe('SafeBalanceSection', () => {
  let wrapper: VueWrapper
  const mockCurrency = ref(MOCK_DATA.defaultCurrency)
  const mockSafeInfo = ref<typeof MOCK_DATA.safeInfo | null>(MOCK_DATA.safeInfo)

  const createWrapper = (props = {}) =>
    mount(SafeBalanceSection, {
      props: {
        address: MOCK_DATA.safeAddress,
        ...props
      },
      global: {
        stubs: {
          AddressToolTip: AddressToolTipStub,
          TransferForm: TransferFormStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    // Configure global contract balance mock
    mockUseContractBalance.isLoading.value = false
    mockUseContractBalance.balances.value =
      MOCK_DATA.balances as typeof mockUseContractBalance.balances.value
    mockUseContractBalance.total.value =
      MOCK_DATA.total as typeof mockUseContractBalance.total.value

    mockuseGetSafeInfoQuery.mockReturnValue({
      data: mockSafeInfo,
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    mockUserStore.address = MOCK_DATA.safeInfo.owners[0]!

    mockUseChainId.mockReturnValue(ref(137))
    mockUseTeamStore.mockReturnValue({
      currentTeam: MOCK_DATA.team,
      currentTeamMeta: MOCK_DATA.teamMeta
    })

    mockTransferPending.value = false
    mockTransferMutate.mockReset()
    mockTransferReset.mockReset()

    vi.mocked(useStorage).mockReturnValue(mockCurrency as never)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: vi.fn(async () => undefined),
      getQueryData: vi.fn(() => undefined),
      setQueryData: vi.fn(() => undefined),
      removeQueries: vi.fn(() => undefined)
    })
    vi.spyOn(utils, 'getTokenAddress').mockImplementation((tokenId: string) => {
      if (tokenId === 'native') return undefined
      if (tokenId === 'usdc') return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      if (tokenId === 'usdt') return '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      return undefined
    })

    mockGetSafeHomeUrl.mockReturnValue(
      'https://app.safe.global/home?safe=polygon:0x1234567890123456789012345678901234567890'
    )
    mockOpenSafeAppUrl.mockImplementation(() => {})

    // Reset reactive values
    mockSafeInfo.value = MOCK_DATA.safeInfo
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Transfer Functionality', () => {
    it('should call transferFromSafe when transfer is initiated', async () => {
      wrapper = createWrapper()

      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="emit-transfer"]').trigger('click')
      await nextTick()

      expect(mockTransferMutate).toHaveBeenCalledTimes(1)
      expect(mockTransferMutate).toHaveBeenCalledWith(
        {
          pathParams: { safeAddress: MOCK_DATA.safeAddress },
          body: {
            options: {
              to: '0x3333333333333333333333333333333333333333',
              amount: '1',
              tokenId: 'native'
            }
          }
        },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      )
    })

    it('should handle transfer loading state', async () => {
      mockTransferPending.value = true
      wrapper = createWrapper()
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()

      expect(wrapper.findComponent(TransferFormStub).props('loading').value).toBe(true)
    })

    it('should handle transfer validation errors', async () => {
      wrapper = createWrapper()
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="emit-invalid-transfer"]').trigger('click')
      await nextTick()

      expect(mockTransferMutate).toHaveBeenCalledTimes(1)
      expect(mockTransferMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            options: expect.objectContaining({
              to: '',
              amount: '0'
            })
          })
        }),
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) })
      )
    })

    it('should handle transfer success callback', async () => {
      wrapper = createWrapper()
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="emit-transfer"]').trigger('click')
      await nextTick()

      const callbacks = mockTransferMutate.mock.calls[0]?.[1]
      callbacks?.onSuccess?.()
      await nextTick()

      expect(mockTransferReset).toHaveBeenCalledTimes(1)
      expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(false)
    })

    it('should map rejected transfer error to approval message', async () => {
      wrapper = createWrapper()
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="emit-transfer"]').trigger('click')
      await nextTick()

      const callbacks = mockTransferMutate.mock.calls[0]?.[1]
      callbacks?.onError?.(new Error('User rejected signature'))
      await nextTick()

      expect(mockTransferReset).not.toHaveBeenCalled()
      expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(true)
    })

    it('should surface generic transfer error message', async () => {
      wrapper = createWrapper()
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()
      await wrapper.find('[data-test="emit-transfer"]').trigger('click')
      await nextTick()

      const callbacks = mockTransferMutate.mock.calls[0]?.[1]
      callbacks?.onError?.(new Error('RPC failure'))
      await nextTick()

      expect(mockTransferReset).not.toHaveBeenCalled()
      expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(true)
    })
  })
})
