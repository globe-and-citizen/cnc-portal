import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import BankBalanceSection from '../BankBalanceSection.vue'
import type { Address } from 'viem'
import { ref, nextTick, defineComponent, isRef, type Ref } from 'vue'
import { NETWORK, USDC_ADDRESS } from '@/constant'
import { mockUseContractBalance } from '@/tests/mocks/useContractBalance.mock'
import type { TokenOption } from '@/types'
import type { ComponentPublicInstance } from 'vue'

// Mock @iconify/vue FIRST, before any other imports
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

// Hoisted mocks - only functions and plain objects
const {
  mockTransfer,
  mockAddAction,
  mockAddSuccessToast,
  mockAddErrorToast,
  mockQueryClient,
  mockWaitForTransactionReceipt
} = vi.hoisted(() => ({
  mockTransfer: vi.fn(),
  mockAddAction: vi.fn(),
  mockAddSuccessToast: vi.fn(),
  mockAddErrorToast: vi.fn(),
  mockQueryClient: { invalidateQueries: vi.fn() },
  mockWaitForTransactionReceipt: vi.fn(() => Promise.resolve({ status: 'success' }))
}))

// Reactive refs created after imports
const mockBankOwner = ref<Address>('0xBankOwner000000000000000000000000000000' as Address)
const mockUserAddress = ref<Address>('0xUser000000000000000000000000000000000' as Address)
const mockIsBodAction = ref(false)
const mockIsActionAdded = ref(false)
const mockIsConfirmingAddAction = ref(false)
const mockIsLoadingAddAction = ref(false)
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

type ModalState = { mount: boolean; show: boolean }
type TransferState = {
  address: { name: string; address: string }
  token: TokenOption | null
  amount: string
}

type BankBalanceSectionInstance = ComponentPublicInstance & {
  transferModal: Ref<ModalState>
  transferData: Ref<TransferState>
  tokens: Ref<TokenOption[]>
  resetTransferValues: () => void
  handleTransfer: (data: {
    address: { address: Address }
    token: { symbol: string }
    amount: string
  }) => Promise<void>
}

const unwrap = <T>(value: Ref<T> | T): T => {
  return isRef(value) ? value.value : value
}

const getVm = (wrapper: VueWrapper): BankBalanceSectionInstance =>
  wrapper.vm as unknown as BankBalanceSectionInstance

vi.mock('@wagmi/vue', () => ({
  useChainId: () => 1,
  useReadContract: () => ({ data: mockBankOwner }),
  useWriteContract: () => ({
    data: mockTransferHash,
    isPending: mockTransferLoading,
    writeContractAsync: mockTransfer
  }),
  useWaitForTransactionReceipt: () => ({
    isLoading: mockIsConfirmingTransfer
  })
}))

vi.mock('@wagmi/core', () => ({
  waitForTransactionReceipt: mockWaitForTransactionReceipt
}))

vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    useQueryClient: () => mockQueryClient
  }
})

vi.mock('@/composables/useContractBalance', () => ({
  useContractBalance: vi.fn(() => mockUseContractBalance)
}))

vi.mock('@/composables/bod/', () => ({
  useBodContract: () => ({
    addAction: mockAddAction,
    useBodIsBodAction: () => ({ isBodAction: mockIsBodAction }),
    isLoading: mockIsLoadingAddAction,
    isConfirming: mockIsConfirmingAddAction,
    isActionAdded: mockIsActionAdded
  })
}))

vi.mock('@/stores', () => ({
  useToastStore: () => ({
    addSuccessToast: mockAddSuccessToast,
    addErrorToast: mockAddErrorToast
  }),
  useUserDataStore: () => ({
    get address() {
      return mockUserAddress.value
    }
  })
}))

vi.mock('@/wagmi.config', () => ({
  config: {}
}))

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
    mockBankOwner.value = '0xBankOwner000000000000000000000000000000' as Address
    mockUserAddress.value = '0xUser000000000000000000000000000000000' as Address
    mockIsBodAction.value = false
    mockIsActionAdded.value = false
    mockIsConfirmingAddAction.value = false
    mockIsLoadingAddAction.value = false
    mockIsConfirmingTransfer.value = false
    mockTransferLoading.value = false
    mockTransferHash.value = undefined
    mockTransfer.mockReset()
    mockAddAction.mockReset()
    mockQueryClient.invalidateQueries.mockClear()
    mockAddSuccessToast.mockClear()
    mockAddErrorToast.mockClear()
    mockWaitForTransactionReceipt.mockClear()
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
    mockUserAddress.value = mockBankOwner.value
    const wrapper = createWrapper()

    const transferButton = wrapper.find('[data-test="transfer-button"]')
    expect(transferButton.classes()).not.toContain('btn-disabled')
    const tooltip = transferButton.element.parentElement?.getAttribute('data-tip')
    expect(tooltip).toBeNull()
  })

  it('maps balances to tokens and filters Sher token', () => {
    mockUseContractBalance.balances.value = [
      ...mockUseContractBalance.balances.value,
      {
        amount: 1,
        token: {
          id: 'sher',
          name: 'Sher Token',
          symbol: 'SHER',
          code: 'SHER',
          coingeckoId: 'sher',
          decimals: 6,
          address: '0x0000000000000000000000000000000000000001'
        },
        values: {
          USD: {
            value: 1,
            formated: '$1',
            id: 'usd',
            code: 'USD',
            symbol: '$',
            price: 1,
            formatedPrice: '$1'
          }
        }
      }
    ]
    const wrapper = createWrapper()
    const tokenList = unwrap<TokenOption[]>(getVm(wrapper).tokens)

    expect(tokenList.some((t) => t.tokenId === 'sher')).toBe(false)
    expect(tokenList[0].tokenId).toBe(mockUseContractBalance.balances.value[0].token.id)
  })

  it('resets transfer values when modal is closed', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    vm.transferModal.value = { mount: true, show: true }
    vm.transferData.value = {
      address: { name: 'test', address: '0xabc' },
      token: unwrap<TokenOption[]>(vm.tokens)[1],
      amount: '10'
    }

    vm.resetTransferValues()
    await nextTick()

    const modalState = unwrap<ModalState>(vm.transferModal)
    const transferData = unwrap<TransferState>(vm.transferData)
    const tokens = unwrap<TokenOption[]>(vm.tokens)

    expect(modalState).toStrictEqual({ mount: false, show: false })
    expect(transferData.amount).toBe('0')
    expect(transferData.address).toStrictEqual({ name: '', address: '' })
    expect(transferData.token).toStrictEqual(tokens[0])
  })

  it.skip('delegates transfer via BOD action', async () => {
    mockIsBodAction.value = true
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await vm.handleTransfer({
      address: { address: '0x456' as Address },
      token: { symbol: NETWORK.currencySymbol },
      amount: '1'
    })

    expect(mockAddAction).toHaveBeenCalledTimes(1)
    const actionPayload = mockAddAction.mock.calls[0][0]
    const description = JSON.parse(actionPayload.description)
    expect(actionPayload.targetAddress).toBe(defaultProps.bankAddress)
    expect(description.text).toContain('1')
    expect(mockTransfer).not.toHaveBeenCalled()
  })

  it('executes direct token transfer and invalidates balance queries', async () => {
    mockTransfer.mockImplementation(async () => {
      mockTransferHash.value = ('0x' + '1'.repeat(64)) as `0x${string}`
    })
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    await vm.handleTransfer({
      address: { address: '0x456' as Address },
      token: { symbol: 'USDC' },
      amount: '1'
    })

    expect(mockTransfer).toHaveBeenCalledWith({
      address: defaultProps.bankAddress,
      abi: expect.any(Array),
      functionName: 'transferToken',
      args: [USDC_ADDRESS, '0x456', expect.any(BigInt)]
    })
    expect(mockWaitForTransactionReceipt).toHaveBeenCalled()
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        'readContract',
        {
          address: USDC_ADDRESS as Address,
          args: [defaultProps.bankAddress],
          chainId: 1
        }
      ]
    })
  })

  it('resets state after BOD action is added', async () => {
    const wrapper = createWrapper()
    const vm = getVm(wrapper)

    mockIsActionAdded.value = true
    await nextTick()

    expect(mockAddSuccessToast).toHaveBeenCalledWith(
      'Action added successfully, waiting for confirmation'
    )
    const modalState = unwrap<ModalState>(vm.transferModal)
    expect(modalState).toStrictEqual({ mount: false, show: false })
  })

  it('handles transfer confirmation watcher', async () => {
    createWrapper()

    mockIsConfirmingTransfer.value = true
    await nextTick()
    mockIsConfirmingTransfer.value = false
    await nextTick()

    expect(mockAddSuccessToast).toHaveBeenCalledWith('Transferred successfully')
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        'readContract',
        {
          address: defaultProps.bankAddress,
          functionName: 'owner'
        }
      ]
    })
  })
})
