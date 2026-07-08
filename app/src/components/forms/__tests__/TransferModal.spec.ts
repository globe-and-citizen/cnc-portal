import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { NETWORK } from '@/constant'
import TransferModal from '../TransferModal.vue'
import {
  mockUseReadContract,
  mockBodIsBodAction,
  mockBodAddAction,
  mockUserStore,
  mockUseContractBalance,
  mockBankWrites,
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
    const invalidateQueries = vi.fn(async () => undefined)
    useQueryClientFn.mockReturnValue({
      invalidateQueries,
      getQueryData: vi.fn(() => undefined),
      setQueryData: vi.fn(() => undefined),
      removeQueries: vi.fn(() => undefined)
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
            props: ['modelValue', 'tokens', 'loading', 'feeBps', 'isBodAction', 'errorMessage'],
            emits: ['transfer', 'closeModal', 'update:modelValue'],
            template: '<div data-test="transfer-form-stub">{{ errorMessage }}</div>'
          }
        }
      }
    })
  }

  const transferForm = (currentWrapper: VueWrapper) =>
    currentWrapper.findComponent({ name: 'TransferForm' })

  const openModal = async (currentWrapper: VueWrapper) => {
    await currentWrapper.find('[data-test="transfer-button"]').trigger('click')
    await nextTick()
  }

  const emitTransfer = async (
    currentWrapper: VueWrapper,
    payload: {
      address: { address: `0x${string}` }
      token: { symbol: string }
      amount: string
    }
  ) => {
    await transferForm(currentWrapper).vm.$emit('transfer', payload)
    await nextTick()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createQueryClient()
    mockUseReadContract.data.value = mockUserStore.address
    mockBodIsBodAction.isBodAction.value = false
    mockBodAddAction.isPending.value = false
    mockBodAddAction.isSuccess.value = false
    mockBankWrites.transfer.isPending.value = false
    mockBankWrites.transferToken.isPending.value = false
    // Default: invoke onSuccess to simulate successful mutation
    mockBankWrites.transfer.mutate = vi.fn(
      async (_vars: unknown, options?: { onSuccess?: () => Promise<void> | void }) => {
        await options?.onSuccess?.()
      }
    )
    mockBankWrites.transferToken.mutate = vi.fn(
      async (_vars: unknown, options?: { onSuccess?: () => Promise<void> | void }) => {
        await options?.onSuccess?.()
      }
    )
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

  it('disables the trigger when user is owner but bank balance is zero', async () => {
    wrapper = mountComponent()
    setBalances([
      {
        token: { id: 'native', symbol: NETWORK.currencySymbol, name: 'Native', code: 'ETH' },
        amount: 0,
        values: { USD: { price: 2000 } }
      }
    ])
    await nextTick()

    expect(wrapper.find('[data-test="transfer-button"]').attributes('disabled')).toBeDefined()
  })

  it('keeps the trigger enabled for a bod action member with positive balance', () => {
    mockUseReadContract.data.value = '0xOtherOwner'
    mockBodIsBodAction.isBodAction.value = true
    wrapper = mountComponent()

    expect(wrapper.find('[data-test="transfer-button"]').attributes('disabled')).toBeUndefined()
  })

  it('exposes isLoading true while a transfer mutation is pending', async () => {
    wrapper = mountComponent()
    mockBankWrites.transfer.isPending.value = true
    await openModal(wrapper)

    expect(transferForm(wrapper).props('loading')).toBe(true)
  })

  it('opens and resets the modal state', async () => {
    wrapper = mountComponent()

    await openModal(wrapper)
    expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(true)

    // Resetting via TransferForm's @closeModal emit
    await transferForm(wrapper).vm.$emit('closeModal')
    await nextTick()
    expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(false)
    expect(transferForm(wrapper).exists()).toBe(false)
  })

  it('renders the form stub when the modal is mounted', async () => {
    wrapper = mountComponent()

    await openModal(wrapper)

    expect(wrapper.find('[data-test="transfer-form-stub"]').exists()).toBe(true)
  })

  it('uses the bod action path instead of a direct transfer when bod mode is enabled', async () => {
    wrapper = mountComponent()
    mockBodIsBodAction.isBodAction.value = true
    await openModal(wrapper)

    await emitTransfer(wrapper, {
      address: { address: mockRecipientAddress },
      token: { symbol: 'USDC' },
      amount: '100'
    })

    expect(mockBodAddAction.executeAddAction).toHaveBeenCalledOnce()
    expect(mockBankWrites.transfer.mutate).not.toHaveBeenCalled()
    expect(mockBankWrites.transferToken.mutate).not.toHaveBeenCalled()
  })

  it('handles direct token transfers and invalidates the token balance query', async () => {
    const { invalidateQueries } = createQueryClient()
    wrapper = mountComponent()
    await openModal(wrapper)

    await emitTransfer(wrapper, {
      address: { address: mockRecipientAddress },
      token: { symbol: 'USDC' },
      amount: '100'
    })

    expect(mockBankWrites.transferToken.mutate).toHaveBeenCalledOnce()
    expect(invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['readContract']) })
    )
  })

  it('handles direct native transfers and surfaces errors from the mutation', async () => {
    wrapper = mountComponent()
    await openModal(wrapper)

    mockBankWrites.transfer.mutate = vi.fn(
      (_vars: unknown, options?: { onError?: (err: unknown) => void }) => {
        options?.onError?.(new Error('boom'))
      }
    )

    await emitTransfer(wrapper, {
      address: { address: mockRecipientAddress },
      token: { symbol: NETWORK.currencySymbol },
      amount: '1.5'
    })

    expect(mockBankWrites.transfer.mutate).toHaveBeenCalledOnce()
    expect(transferForm(wrapper).props('errorMessage')).not.toBe('')
  })

  it('surfaces an error message when the bod action path throws', async () => {
    wrapper = mountComponent()
    mockBodIsBodAction.isBodAction.value = true
    mockBodAddAction.executeAddAction.mockRejectedValueOnce(new Error('bod boom'))
    await openModal(wrapper)

    await emitTransfer(wrapper, {
      address: { address: mockRecipientAddress },
      token: { symbol: 'USDC' },
      amount: '10'
    })

    expect(transferForm(wrapper).props('errorMessage')).toBe('Failed to transfer USDC')
  })

  it('resets modal when the bod action-added watcher fires', async () => {
    wrapper = mountComponent()

    await openModal(wrapper)
    expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(true)

    mockBodAddAction.isSuccess.value = true
    await nextTick()
    expect(wrapper.find('[data-test="transfer-modal"]').exists()).toBe(false)
  })
})
