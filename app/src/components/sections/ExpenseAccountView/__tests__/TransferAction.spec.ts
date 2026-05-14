import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { readContract, estimateGas } from '@wagmi/core'
import TransferAction from '../TransferAction.vue'
import {
  mockExpenseAccountWrites,
  mockERC20Writes,
  resetContractMocks,
  resetERC20Mocks
} from '@/tests/mocks'

vi.mock('@/utils', () => ({
  log: { error: vi.fn() },
  parseError: vi.fn(() => 'Parsed error:'),
  getTokens: vi.fn(() => [{ symbol: 'USDC', balance: 100, spendableBalance: 100 }])
}))

vi.mock('@/composables', () => ({
  useContractBalance: () => ({ balances: ref({}) })
}))

vi.mock('@wagmi/core', () => ({
  readContract: vi.fn(),
  estimateGas: vi.fn()
}))

const MockTransferForm = {
  template: '<div data-test="transfer-form" />',
  props: ['tokens', 'loading', 'modelValue'],
  emits: ['transfer', 'closeModal']
}

type Vm = {
  transferFromExpenseAccount: (to: string, amount: string) => Promise<void>
  errorMessage: string
}

type MutationOpts = { onSuccess?: () => void; onError?: (e: unknown) => void }

describe('TransferAction.vue', () => {
  const transfer = mockExpenseAccountWrites.transfer
  const approve = mockERC20Writes.approve

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const NATIVE_BUDGET = {
    tokenAddress: ZERO_ADDRESS,
    approvedAddress: '0xApprovedAddress',
    amount: 1,
    frequencyType: 3,
    startDate: 1,
    endDate: 2,
    customFrequency: 0
  }
  const ERC20_BUDGET = {
    ...NATIVE_BUDGET,
    tokenAddress: '0x0000000000000000000000000000000000000001'
  }

  const createComponent = (data = ERC20_BUDGET) =>
    mount(TransferAction, {
      global: {
        stubs: { TransferForm: MockTransferForm, teleport: true }
      },
      props: {
        row: {
          status: 'enabled',
          signature: '0xSignature',
          data,
          balances: ['0', '0']
        }
      }
    })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    resetContractMocks()
    resetERC20Mocks()
    vi.mocked(estimateGas).mockResolvedValue(21000n)
  })

  it('invokes transfer when ERC20 allowance is sufficient', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(BigInt(200 * 1e6))
    const wrapper = createComponent()
    await (wrapper.vm as unknown as Vm).transferFromExpenseAccount('0xRecipient', '1')
    await flushPromises()

    expect(approve.mutate).not.toHaveBeenCalled()
    expect(transfer.mutate).toHaveBeenCalled()
  })

  it('approves then transfers when allowance is insufficient', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(0n)
    approve.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) => {
      opts?.onSuccess?.()
    })

    const wrapper = createComponent()
    await (wrapper.vm as unknown as Vm).transferFromExpenseAccount('0xRecipient', '1')
    await flushPromises()

    expect(approve.mutate).toHaveBeenCalled()
    expect(transfer.mutate).toHaveBeenCalled()
  })

  it('surfaces approve errors via errorMessage', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(0n)
    approve.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) => {
      opts?.onError?.(new Error('approve failed'))
    })

    const wrapper = createComponent()
    await (wrapper.vm as unknown as Vm).transferFromExpenseAccount('0xRecipient', '1')
    await flushPromises()

    expect(transfer.mutate).not.toHaveBeenCalled()
    expect((wrapper.vm as unknown as Vm).errorMessage).toBe('Failed to approve token spending')
  })

  it('surfaces transfer errors via errorMessage', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(BigInt(200 * 1e6))
    transfer.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) => {
      opts?.onError?.(new Error('transfer failed'))
    })

    const wrapper = createComponent()
    await (wrapper.vm as unknown as Vm).transferFromExpenseAccount('0xRecipient', '1')
    await flushPromises()

    expect((wrapper.vm as unknown as Vm).errorMessage).toBe('Failed to transfer')
  })

  it('estimates gas then transfers a native deposit', async () => {
    const wrapper = createComponent(NATIVE_BUDGET)
    await (wrapper.vm as unknown as Vm).transferFromExpenseAccount('0xRecipient', '1')
    await flushPromises()

    expect(estimateGas).toHaveBeenCalled()
    expect(transfer.mutate).toHaveBeenCalled()
  })
})
