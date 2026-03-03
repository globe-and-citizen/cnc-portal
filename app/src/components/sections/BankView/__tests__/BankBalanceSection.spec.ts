import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import type { Address } from 'viem'
import { ref, defineComponent } from 'vue'
// import { NETWORK, USDC_ADDRESS } from '@/constant'
import {
  mockUseContractBalance,
  useWriteContractFn,
  useWaitForTransactionReceiptFn,
  useReadContractFn,
  useQueryClientFn,
  mockBodAddAction,
  mockBodIsBodAction,
  mockToastStore,
  mockUserStore,
  mockWagmiCore
} from '@/tests/mocks'
import { useUserDataStore } from '@/stores'

// Mock @iconify/vue FIRST, before any other imports
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

const mockTransfer = vi.fn()

// Reactive refs created after imports
const mockBankOwner = ref<Address>('0xBankOwner000000000000000000000000000000' as Address)
const mockIsConfirmingTransfer = ref(false)
const mockTransferHash = ref<`0x${string}` | undefined>()
const mockTransferLoading = ref(false)

const baseBalances = [
  {
    amount: 0.5,
    token: {
      id: 'native',
      name: 'SepoliaETH',
      symbol: 'SepoliaETH',
      code: 'SepoliaETH',
      coingeckoId: 'ethereum',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000'
    },
    values: {
      USD: {
        value: 500,
        formated: '$500',
        id: 'usd',
        code: 'USD',
        symbol: '$',
        price: 1000,
        formatedPrice: '$1K'
      }
    }
  },
  {
    amount: 50,
    token: {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      code: 'USDC',
      coingeckoId: 'usd-coin',
      decimals: 6,
      address: '0xA3492D046095AFFE351cFac15de9b86425E235dB'
    },
    values: {
      USD: {
        value: 50000,
        formated: '$50K',
        id: 'usd',
        code: 'USD',
        symbol: '$',
        price: 1000,
        formatedPrice: '$1K'
      }
    }
  }
]

const baseTotal = {
  USD: {
    value: 50500,
    formated: '$50.5K',
    id: 'usd',
    code: 'USD',
    symbol: '$',
    price: 1000,
    formatedPrice: '$1K'
  }
}

const baseDividends = {
  USD: {
    value: 100,
    formated: '$100',
    id: 'usd',
    code: 'USD',
    symbol: '$',
    price: 1000,
    formatedPrice: '$1K'
  }
}

const ModalStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue', 'reset'],
  template: '<div><slot /></div>'
})

const TransferFormStub = defineComponent({
  props: ['modelValue', 'tokens', 'loading', 'isBodAction'],
  emits: ['update:modelValue', 'transfer', 'closeModal'],
  template: `
    <div>
      <slot name="header"></slot>
      <button data-test="transfer-submit" @click="$emit('transfer', modelValue)">submit</button>
      <button data-test="transfer-close" @click="$emit('closeModal')">close</button>
    </div>
  `
})

const DepositFormStub = defineComponent({
  template: '<div />'
})

describe('BankBalanceSection', () => {
  const defaultProps = {
    bankAddress: '0x1234567890123456789012345678901234567890' as Address
  }

  const createWrapper = () =>
    mount(BankBalanceSection, {
      props: defaultProps,
      global: {
        stubs: {
          ModalComponent: ModalStub,
          TransferForm: TransferFormStub,
          DepositBankForm: DepositFormStub,
          CardComponent: defineComponent({ template: '<div><slot /></div>' }),
          AddressToolTip: defineComponent({ props: ['address'], template: '<div />' })
        }
      }
    }) as VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    // Configure wagmi composable mocks
    useReadContractFn.mockReturnValue({ data: mockBankOwner, error: ref(null) })
    useWriteContractFn.mockReturnValue({
      data: mockTransferHash,
      isPending: mockTransferLoading,
      mutateAsync: mockTransfer,
      mutate: vi.fn(),
      error: ref(null)
    })
    useWaitForTransactionReceiptFn.mockReturnValue({
      isLoading: mockIsConfirmingTransfer,
      data: ref(null),
      isSuccess: ref(false)
    })
    useQueryClientFn.mockReturnValue({ invalidateQueries: vi.fn() })
    // Configure store mocks
    vi.mocked(useUserDataStore).mockReturnValue({
      ...mockUserStore,
      address: '0xUser000000000000000000000000000000000' as Address
    })
    // Reset balance state
    mockUseContractBalance.balances.value = baseBalances.map((balance) => ({
      ...balance,
      token: { ...balance.token },
      values: {
        USD: { ...balance.values.USD }
      }
    }))
    mockUseContractBalance.total.value = {
      USD: { ...baseTotal.USD }
    }
    mockUseContractBalance.dividendsTotal.value = {
      USD: { ...baseDividends.USD }
    }
    mockUseContractBalance.isLoading.value = false
    // Reset local refs
    mockBankOwner.value = '0xBankOwner000000000000000000000000000000' as Address
    mockIsConfirmingTransfer.value = false
    mockTransferLoading.value = false
    mockTransferHash.value = undefined
    mockTransfer.mockReset()
    // Reset global BOD mocks
    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isPending.value = false
    mockBodAddAction.isConfirming.value = false
    mockBodAddAction.isActionAdded.value = false
    mockBodAddAction.executeAddAction.mockReset()
    mockToastStore.addSuccessToast.mockClear()
    mockToastStore.addErrorToast.mockClear()
    mockWagmiCore.waitForTransactionReceipt.mockClear()
  })

  it('renders total balance and dividends', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain(mockUseContractBalance.total.value.USD.formated)
    expect(wrapper.text()).toContain(mockUseContractBalance.dividendsTotal.value.USD.formated)
  })

  it('disables transfer when user is not the bank owner or BOD', () => {
    const wrapper = createWrapper()

    const transferButton = wrapper.find('[data-test="transfer-button"]')
    expect(transferButton.classes()).toContain('btn-disabled')
    const tooltip = transferButton.element.parentElement?.getAttribute('data-tip')
    expect(tooltip).toBe('Only the bank owner can transfer funds')
  })

  it('enables transfer when the user is the bank owner', () => {
    vi.mocked(useUserDataStore).mockReturnValue({
      ...mockUserStore,
      address: mockBankOwner.value
    })
    const wrapper = createWrapper()

    const transferButton = wrapper.find('[data-test="transfer-button"]')
    expect(transferButton.classes()).not.toContain('btn-disabled')
    const tooltip = transferButton.element.parentElement?.getAttribute('data-tip')
    expect(tooltip).toBeNull()
  })
})
