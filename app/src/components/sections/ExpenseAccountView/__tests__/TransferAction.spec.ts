import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref, toValue } from 'vue'
import { readContract, estimateGas } from '@wagmi/core'
import { recoverTypedDataAddress } from 'viem'
import TransferAction from '../TransferAction.vue'
import {
  makeTokenBalance,
  mockERC20Writes,
  mockExpenseAccountWrites,
  mockTeamStore
} from '@/tests/mocks'
import { SUPPORTED_TOKENS, USDC_ADDRESS } from '@/constant'
import type { TokenBalance } from '@/types'

const usdcConfig = SUPPORTED_TOKENS.find((token) => token.id === 'usdc')!
const defaultBalances = (): TokenBalance[] => [
  makeTokenBalance({ amount: 100 }),
  makeTokenBalance({ token: usdcConfig, amount: 100, usdPrice: 1 })
]

// `classifyError` is left un-mocked so these tests assert the message the user
// actually sees, rather than a stand-in string.
// Kept as a spy so a test can assert *what* the balance query was keyed on:
// the address arrives with the team query, so the argument has to stay a live
// source rather than a value read once during setup.
const contractBalanceState = {
  data: ref<{ balances: TokenBalance[]; total: undefined } | undefined>({
    balances: defaultBalances(),
    total: undefined
  }),
  isLoading: ref(false),
  error: ref<Error | null>(null)
}
const useContractBalanceSpy = vi.fn(() => contractBalanceState)

vi.mock('@/composables', () => ({
  useContractBalance: (address: unknown) => useContractBalanceSpy(address)
}))

const MockTransferForm = {
  name: 'TransferForm',
  template: '<div data-test="transfer-form" />',
  props: ['tokens', 'loading', 'modelValue'],
  emits: ['transfer', 'closeModal']
}

type MutationOpts = { onSuccess?: () => void; onError?: (e: unknown) => void }

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const OWNER_ADDRESS = '0x1234567890123456789012345678901234567890'
const CURRENT_EXPENSE_ACCOUNT = '0x5555555555555555555555555555555555555555'
const NATIVE_BUDGET = {
  tokenAddress: ZERO_ADDRESS,
  approvedAddress: '0xApprovedAddress',
  amount: 1,
  frequencyType: 3,
  startDate: 1,
  endDate: 2,
  customFrequency: 0,
  signedAgainstContractAddress: CURRENT_EXPENSE_ACCOUNT,
  chainId: 1
}
const ERC20_BUDGET = {
  ...NATIVE_BUDGET,
  tokenAddress: USDC_ADDRESS,
  amount: 100
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
    contractBalanceState.data.value = { balances: defaultBalances(), total: undefined }
    contractBalanceState.isLoading.value = false
    contractBalanceState.error.value = null
    vi.mocked(estimateGas).mockResolvedValue(21000n)
    vi.mocked(recoverTypedDataAddress).mockResolvedValue(OWNER_ADDRESS)
  })

  describe('contract balance', () => {
    const openModal = async (wrapper: VueWrapper) => {
      await wrapper.find('[data-test="transfer-button"]').trigger('click')
      await flushPromises()
    }

    it('keys the balance query on a live address, not one read at setup', async () => {
      // The address comes from the team query, which routinely resolves after
      // this row has mounted. Passing `ref(store.getContractAddressByType(...))`
      // froze `undefined` in place, leaving the query disabled forever: no
      // balance, a spendable balance of 0, and no transfer form. The ref here
      // stands in for the query data the real store reads.
      const teamAddress = ref<string | undefined>(undefined)
      mockTeamStore.getContractAddressByType = vi.fn(() => teamAddress.value)
      createComponent()

      const [addressSource] = useContractBalanceSpy.mock.calls[0]!
      expect(toValue(addressSource)).toBeUndefined()

      teamAddress.value = CURRENT_EXPENSE_ACCOUNT
      await nextTick()

      expect(toValue(addressSource)).toBe(CURRENT_EXPENSE_ACCOUNT)
    })

    it('explains itself while the balance is still loading', async () => {
      contractBalanceState.data.value = { balances: [], total: undefined }
      contractBalanceState.isLoading.value = true

      const wrapper = createComponent()
      await openModal(wrapper)

      expect(wrapper.find('[data-test="balance-loading"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="transfer-form"]').exists()).toBe(false)
    })

    it('reports a failed balance read instead of an empty dialog', async () => {
      contractBalanceState.data.value = { balances: [], total: undefined }
      contractBalanceState.error.value = new Error('rpc down')

      const wrapper = createComponent()
      await openModal(wrapper)

      expect(wrapper.find('[data-test="balance-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="transfer-form"]').exists()).toBe(false)
    })

    it('labels the spendable balance with the expense token symbol', async () => {
      // The symbol used to come from the empty form model, so the dialog opened
      // on a bare, unitless number.
      const wrapper = createComponent()
      await openModal(wrapper)

      expect(wrapper.findComponent({ name: 'UModal' }).props('description')).toBe(
        'Spendable balance: 100 USDC'
      )
    })

    it('omits the balance label entirely when there is no token to describe', async () => {
      contractBalanceState.data.value = { balances: [], total: undefined }
      contractBalanceState.isLoading.value = true

      const wrapper = createComponent()
      await openModal(wrapper)

      expect(wrapper.findComponent({ name: 'UModal' }).props('description')).toBeUndefined()
    })
  })

  // `ExpenseAccountEIP712.transfer` spends the contract's own token balance, so
  // the member's allowance is irrelevant: no allowance read, no approval.
  it('transfers ERC20 without reading an allowance or requesting an approval', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(OWNER_ADDRESS)

    const wrapper = createComponent()
    await submitTransfer(wrapper, { to: '0xRecipient', amount: '1' })

    expect(approve.mutate).not.toHaveBeenCalled()
    // The only on-chain read is the owner lookup used to verify the signature.
    expect(readContract).toHaveBeenCalledTimes(1)
    expect(transfer.mutate).toHaveBeenCalledWith(
      { args: ['0xRecipient', BigInt(1e6), expect.anything(), '0xSignature'] },
      expect.anything()
    )
  })

  it('shows transfer error in the alert', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(OWNER_ADDRESS)
    transfer.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) => {
      opts?.onError?.(new Error('transfer failed'))
    })

    const wrapper = createComponent()
    await submitTransfer(wrapper)

    expect(wrapper.text()).toContain('transfer failed')
  })

  it('estimates gas then transfers a native deposit', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(OWNER_ADDRESS)
    const wrapper = createComponent(NATIVE_BUDGET)
    await submitTransfer(wrapper)

    expect(estimateGas).toHaveBeenCalled()
    expect(transfer.mutate).toHaveBeenCalled()
  })

  it('closes the modal when the transfer mutation resolves', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(OWNER_ADDRESS)
    transfer.mutate.mockImplementationOnce((_v: unknown, opts?: MutationOpts) =>
      opts?.onSuccess?.()
    )

    const wrapper = createComponent()
    await submitTransfer(wrapper)

    expect(wrapper.find('[data-test="transfer-form"]').exists()).toBe(false)
  })

  it('shows the classified error when estimateGas rejects on native transfer', async () => {
    vi.mocked(readContract).mockResolvedValueOnce(OWNER_ADDRESS)
    vi.mocked(estimateGas).mockRejectedValueOnce(new Error('insufficient funds'))
    const wrapper = createComponent(NATIVE_BUDGET)
    await submitTransfer(wrapper)

    expect(transfer.mutate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('insufficient funds')
  })

  it('surfaces a verification failure when the owner lookup rejects', async () => {
    vi.mocked(readContract).mockRejectedValueOnce(new Error('rpc error'))
    const wrapper = createComponent()
    await submitTransfer(wrapper)

    expect(transfer.mutate).not.toHaveBeenCalled()
    expect(approve.mutate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Failed to verify expense approval signature')
  })

  it('blocks transfers when the approval was signed for another expense account', async () => {
    const wrapper = createComponent({
      ...ERC20_BUDGET,
      signedAgainstContractAddress: '0x6666666666666666666666666666666666666666'
    })
    await submitTransfer(wrapper)

    expect(readContract).not.toHaveBeenCalled()
    expect(transfer.mutate).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Signature issued for a different ExpenseAccount contract')
  })
})
