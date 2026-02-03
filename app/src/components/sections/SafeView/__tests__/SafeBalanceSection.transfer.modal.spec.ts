import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import { useStorage } from '@vueuse/core'
import type { Address } from 'viem'
import SafeBalanceSection from '../SafeBalanceSection.vue'
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

const {
  mockGetSafeHomeUrl,
  mockOpenSafeAppUrl,
  mockUseChainId,
  mockUseTeamStore,
  mockUseContractBalance,
  mockUseSafeInfoQuery,
  mockQueryClient,
  mockUseSafeTransfer
} = vi.hoisted(() => ({
  mockGetSafeHomeUrl: vi.fn(),
  mockOpenSafeAppUrl: vi.fn(),
  mockUseChainId: vi.fn(),
  mockUseTeamStore: vi.fn(),
  mockUseContractBalance: vi.fn(),
  mockUseSafeInfoQuery: vi.fn(),
  mockQueryClient: {
    invalidateQueries: vi.fn()
  },
  mockUseSafeTransfer: vi.fn(() => ({
    transferFromSafe: vi.fn(),
    transferNative: vi.fn(),
    transferToken: vi.fn(),
    isTransferring: ref(false),
    error: ref(null)
  }))
}))

vi.mock('@/composables/safe', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getSafeHomeUrl: mockGetSafeHomeUrl,
    openSafeAppUrl: mockOpenSafeAppUrl,
    useSafeTransfer: mockUseSafeTransfer
  }
})

vi.mock('@vueuse/core', () => ({
  useStorage: vi.fn()
}))

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: mockUseContractBalance
}))
vi.mock('@/queries/safe.queries', () => ({
  useSafeInfoQuery: mockUseSafeInfoQuery
}))
vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: () => mockQueryClient
}))

// Test constants
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  safeInfo: {
    owners: [
      '0x1111111111111111111111111111111111111111' as Address,
      '0x2222222222222222222222222222222222222222' as Address
    ],
    threshold: 2
  },
  balances: [
    {
      token: {
        symbol: 'ETH',
        id: 'ethereum',
        name: 'Ethereum',
        code: 'ETH'
      },
      amount: 1.5,
      values: {
        USD: {
          value: 3000,
          formated: '$3,000',
          price: 2000
        }
      }
    }
  ],
  total: {
    USD: {
      value: 4500,
      formated: '$4,500',
      price: 1
    }
  },
  defaultCurrency: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$'
  },
  team: {
    safeAddress: '0x1234567890123456789012345678901234567890' as Address,
    id: '1',
    name: 'Test Team'
  },
  teamMeta: {
    data: {
      safeAddress: '0x1234567890123456789012345678901234567890' as Address
    }
  }
} as const

// Component stubs
const CardStub = defineComponent({
  template: '<div data-test="card-component"><slot /></div>'
})

const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button data-test="button" @click="$emit(\'click\')"><slot /></button>'
})

const AddressToolTipStub = defineComponent({
  template: '<div data-test="address-tooltip"></div>'
})

const ModalStub = defineComponent({
  props: ['modelValue'],
  template: '<div data-test="modal" v-if="modelValue"><slot /></div>'
})

const DepositBankFormStub = defineComponent({
  template: '<div data-test="deposit-bank-form">Deposit Form</div>'
})

const TransferFormStub = defineComponent({
  template: '<div data-test="transfer-form"><slot name="header" /></div>'
})

interface SafeBalanceSectionInstance {
  closeDepositModal: () => Promise<void>
  resetTransferValues: () => Promise<void>
  tokens: Array<{ symbol: string; price: number; tokenId: string }>
  transferData: { token: { symbol: string; tokenId: string } }
}

describe('SafeBalanceSection transfer modals', () => {
  let wrapper: VueWrapper
  const mockCurrency = ref(MOCK_DATA.defaultCurrency)
  const mockBalances = ref(MOCK_DATA.balances)
  const mockTotal = ref(MOCK_DATA.total)
  const mockIsLoading = ref(false)
  const mockSafeInfo = ref(MOCK_DATA.safeInfo)

  const createWrapper = (props = {}) =>
    mount(SafeBalanceSection, {
      props,
      global: {
        stubs: {
          CardComponent: CardStub,
          ButtonUI: ButtonStub,
          AddressToolTip: AddressToolTipStub,
          ModalComponent: ModalStub,
          DepositBankForm: DepositBankFormStub,
          TransferForm: TransferFormStub
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseContractBalance.mockReturnValue({
      total: mockTotal,
      balances: mockBalances,
      isLoading: mockIsLoading
    })

    mockUseSafeInfoQuery.mockReturnValue({
      data: mockSafeInfo
    })

    mockUseChainId.mockReturnValue(ref(137))
    mockUseTeamStore.mockReturnValue({
      currentTeam: MOCK_DATA.team,
      currentTeamMeta: MOCK_DATA.teamMeta
    })

    mockUseSafeTransfer.mockReturnValue({
      transferFromSafe: vi.fn().mockResolvedValue('0xmocktxhash'),
      transferNative: vi.fn().mockResolvedValue('0xmocktxhash'),
      transferToken: vi.fn().mockResolvedValue('0xmocktxhash'),
      isTransferring: ref(false),
      error: ref(null)
    })

    vi.mocked(useStorage).mockReturnValue(mockCurrency as never)

    mockGetSafeHomeUrl.mockReturnValue(
      'https://app.safe.global/home?safe=polygon:0x1234567890123456789012345678901234567890'
    )
    mockOpenSafeAppUrl.mockImplementation(() => {})

    mockIsLoading.value = false
    mockBalances.value = MOCK_DATA.balances
    mockTotal.value = MOCK_DATA.total
    mockSafeInfo.value = MOCK_DATA.safeInfo
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Deposit Modal', () => {
    it('should not invalidate queries when teamStore has no safeAddress', async () => {
      vi.useFakeTimers()
      mockUseTeamStore.mockReturnValue({
        currentTeam: { safeAddress: undefined },
        currentTeamMeta: { data: { safeAddress: undefined } }
      })
      wrapper = createWrapper()

      await wrapper.find('[data-test="deposit-button"]').trigger('click')
      await nextTick()

      const closePromise = (wrapper.vm as SafeBalanceSectionInstance).closeDepositModal()

      await vi.advanceTimersByTimeAsync(2000)
      await closePromise
      await flushPromises()

      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('Transfer Modal', () => {
    it('should handle empty tokens list gracefully', async () => {
      mockBalances.value = []
      wrapper = createWrapper()

      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()

      const transferData = (wrapper.vm as SafeBalanceSectionInstance).transferData
      expect(transferData.token.symbol).toBe('')
    })

    it('should close transfer modal and reset values', async () => {
      wrapper = createWrapper()

      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await nextTick()

      expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(true)

      await (wrapper.vm as SafeBalanceSectionInstance).resetTransferValues()
      await nextTick()

      expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(false)
    })
  })
})
