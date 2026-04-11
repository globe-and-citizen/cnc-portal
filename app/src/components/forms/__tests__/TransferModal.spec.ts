import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { NETWORK } from '@/constant'
import TransferModal from '../TransferModal.vue'
import {
  mockUseWriteContract,
  mockUseReadContract,
  mockUseWaitForTransactionReceipt,
  mockBodIsBodAction,
  mockBodAddAction,
  mockUserStore,
  mockUseContractBalance,
  mockWagmiCore,
  transferHash,
  useQueryClientFn
} from '@/tests/mocks'

vi.mock('@/artifacts/abi/bank', () => ({
  BANK_ABI: [
    {
      type: 'function',
      name: 'owner',
      outputs: [{ name: '', type: 'address' }]
    },
    {
      type: 'function',
      name: 'transfer',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    },
    {
      type: 'function',
      name: 'transferToken',
      inputs: [
        { name: 'token', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ]
    }
  ]
}))

type TransferModalVm = {
  modal: { mount: boolean; show: boolean }
  errorMessage: string
  transferData: {
    address: { name: string; address: string }
    token: { symbol: string; balance: number }
    amount: string
  }
  openModal: () => void
  resetTransferValues: () => void
  handleTransfer: (value: {
    address: { address: `0x${string}` }
    token: { symbol: string }
    amount: string
  }) => Promise<void>
}

describe('TransferModal', () => {
  let wrapper: VueWrapper

  const mockBankAddress = '0x1234567890123456789012345678901234567890' as const
  const mockRecipientAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as const

  const setBalances = (balances?: Array<Record<string, unknown>>) => {
    mockUseContractBalance.balances.value =
      (balances as never) ??
      ([
        {
          token: { id: 'native', symbol: NETWORK.currencySymbol, name: 'Native', code: 'ETH' },
          amount: 10,
          values: { USD: { price: 2000 } }
        },
        {
          token: { id: 'usdc', symbol: 'USDC', name: 'USD Coin', code: 'USDC' },
          amount: 5000,
          values: { USD: { price: 1 } }
        }
      ] as never)
  }

  const createQueryClient = () => {
    const invalidateQueries = vi.fn()
    useQueryClientFn.mockReturnValue({
      invalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
    return { invalidateQueries }
  }

  const mountComponent = () => {
    mockUseReadContract.data.value = mockUserStore.address
    setBalances()

    return mount(TransferModal, {
      props: {
        bankAddress: mockBankAddress
      },
      global: {
        stubs: {
          TransferForm: {
            name: 'TransferForm',
            props: ['modelValue', 'tokens', 'loading', 'feeBps', 'isBodAction'],
            emits: ['transfer', 'closeModal', 'update:modelValue'],
            template: '<div data-test="transfer-form-stub" />'
          }
        }
      }
    })
  }

  const getVm = (currentWrapper: VueWrapper) => currentWrapper.vm as unknown as TransferModalVm

  beforeEach(() => {
    vi.clearAllMocks()
    createQueryClient()
    mockUseReadContract.data.value = mockUserStore.address
    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isPending.value = false
    mockBodAddAction.isConfirming.value = false
    mockBodAddAction.isActionAdded.value = false
    mockUseWaitForTransactionReceipt.isLoading.value = false
    mockUseWriteContract.mutateAsync.mockResolvedValue(undefined)
    mockWagmiCore.waitForTransactionReceipt.mockResolvedValue({ status: 'success' })
    transferHash.value = undefined
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  it('disables the trigger and shows the correct tooltip when the user lacks rights or the balance is zero', () => {
    mockUseReadContract.data.value = '0x9999999999999999999999999999999999999999'
    setBalances([
      {
        token: { id: 'native', symbol: NETWORK.currencySymbol, name: 'Native', code: 'ETH' },
        amount: 0,
        values: { USD: { price: 2000 } }
      }
    ])
    wrapper = mountComponent()

    expect(wrapper.find('[data-test="transfer-button"]').exists()).toBe(true)
  })

  it('opens and resets the modal state', async () => {
    wrapper = mountComponent()
    const vm = getVm(wrapper)

    await wrapper.find('[data-test="transfer-button"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(true)

    vm.resetTransferValues()
    await nextTick()
    expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(false)
    expect(vm.errorMessage).toBe('')
  })

  it('renders the form stub when the modal is mounted', async () => {
    wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.openModal()
    await nextTick()

    expect(wrapper.find('[data-test="transfer-form-stub"]').exists()).toBe(true)
  })

  it('uses the bod action path instead of a direct transfer when bod mode is enabled', async () => {
    wrapper = mountComponent()
    const vm = getVm(wrapper)
    mockBodIsBodAction.isBodAction.value = true

    await vm.handleTransfer({
      address: { address: mockRecipientAddress },
      token: { symbol: 'USDC' },
      amount: '100'
    })

    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledOnce()
    expect(mockUseWriteContract.mutateAsync).not.toHaveBeenCalled()
  })

  it('handles direct token transfers and invalidates the token balance query', async () => {
    const { invalidateQueries } = createQueryClient()
    wrapper = mountComponent()
    const vm = getVm(wrapper)
    transferHash.value = '0xhash'

    await vm.handleTransfer({
      address: { address: mockRecipientAddress },
      token: { symbol: 'USDC' },
      amount: '100'
    })

    expect(mockUseWriteContract.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'transferToken' })
    )
    expect(mockWagmiCore.waitForTransactionReceipt).toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['readContract']) })
    )
  })

  it('handles direct native transfers and exposes errors when no receipt hash is available', async () => {
    wrapper = mountComponent()
    const vm = getVm(wrapper)

    await vm.handleTransfer({
      address: { address: mockRecipientAddress },
      token: { symbol: NETWORK.currencySymbol },
      amount: '1.5'
    })

    expect(mockUseWriteContract.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: 'transfer' })
    )
    expect(vm.errorMessage).toBe(`Failed to transfer ${NETWORK.currencySymbol}`)
  })

  it('resets after action-added and transfer-confirmed watchers fire', async () => {
    const { invalidateQueries } = createQueryClient()
    wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.openModal()
    vm.errorMessage = 'Something failed'
    await nextTick()

    mockBodAddAction.isActionAdded.value = true
    await nextTick()
    expect(vm.modal.show).toBe(false)
    expect(vm.errorMessage).toBe('')

    vm.openModal()
    mockUseWaitForTransactionReceipt.isLoading.value = true
    await nextTick()
    mockUseWaitForTransactionReceipt.isLoading.value = false
    await nextTick()

    expect(vm.modal.show).toBe(false)
    expect(invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['readContract']) })
    )
  })
})
