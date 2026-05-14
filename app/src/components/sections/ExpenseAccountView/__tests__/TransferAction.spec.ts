import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
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
  name: 'TransferForm',
  template: '<div data-test="transfer-form" />',
  props: ['tokens', 'loading', 'modelValue'],
  emits: ['transfer', 'closeModal']
}

type MutationOpts = { onSuccess?: () => void; onError?: (e: unknown) => void }

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

describe('TransferAction.vue', () => {
  const transfer = mockExpenseAccountWrites.transfer
  const approve = mockERC20Writes.approve

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

  // Open the modal (click Spend) and submit the TransferForm with the given
  // recipient/amount via the same `transfer` event the real form emits.
  const submitTransfer = async (
    wrapper: VueWrapper,
    { to = '0xRecipient', amount = '1' }: { to?: string; amount?: string } = {}
  ) => {
    await wrapper.find('[data-test="transfer-button"]').trigger('click')
    await flushPromises()
    const form = wrapper.findComponent({ name: 'TransferForm' })
    expect(form.exists()).toBe(true)
    await form.vm.$emit('transfer', { address: { address: to }, amount })
    await flushPromises()
  }

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
    await submitTransfer(wrapper)

    expect(approve.mutate).not.toHaveBeenCalled()
    expect(transfer.mutate).toHaveBeenCalled()
  })

  it('approves then transfers when allowance is insufficient', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(0n)
    approve.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) => {
      opts?.onSuccess?.()
    })

    const wrapper = createComponent()
    await submitTransfer(wrapper)

    expect(approve.mutate).toHaveBeenCalled()
    expect(transfer.mutate).toHaveBeenCalled()
  })

  it('shows approve error in the alert and skips the transfer', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(0n)
    approve.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) => {
      opts?.onError?.(new Error('approve failed'))
    })

    const wrapper = createComponent()
    await submitTransfer(wrapper)

    expect(transfer.mutate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Failed to approve token spending')
  })

  it('shows transfer error in the alert', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(BigInt(200 * 1e6))
    transfer.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) => {
      opts?.onError?.(new Error('transfer failed'))
    })

    const wrapper = createComponent()
    await submitTransfer(wrapper)

    expect(wrapper.text()).toContain('Failed to transfer')
  })

  it('estimates gas then transfers a native deposit', async () => {
    const wrapper = createComponent(NATIVE_BUDGET)
    await submitTransfer(wrapper)

    expect(estimateGas).toHaveBeenCalled()
    expect(transfer.mutate).toHaveBeenCalled()
  })

  it('closes the modal when the transfer mutation resolves', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(BigInt(200 * 1e6))
    transfer.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) =>
      opts?.onSuccess?.()
    )

    const wrapper = createComponent()
    await submitTransfer(wrapper)

    expect(wrapper.find('[data-test="transfer-form"]').exists()).toBe(false)
  })

  it('shows the parsed error when estimateGas rejects on native transfer', async () => {
    vi.mocked(estimateGas).mockRejectedValueOnce(new Error('insufficient funds'))
    const wrapper = createComponent(NATIVE_BUDGET)
    await submitTransfer(wrapper)

    expect(transfer.mutate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Parsed error:')
  })

  it('surfaces "Failed to read allowance" when readContract rejects', async () => {
    vi.mocked(readContract).mockRejectedValueOnce(new Error('rpc error'))
    const wrapper = createComponent()
    await submitTransfer(wrapper)

    expect(transfer.mutate).not.toHaveBeenCalled()
    expect(approve.mutate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Failed to read allowance')
  })
})
