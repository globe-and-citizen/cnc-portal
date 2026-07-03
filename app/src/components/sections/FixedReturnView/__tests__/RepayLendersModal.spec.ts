import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RepayLendersModal from '../RepayLendersModal.vue'
import {
  mockERC20Reads,
  mockERC20Writes,
  mockFixedReturnWrites,
  mockInvalidateQueries,
  useQueryClientFn
} from '@/tests/mocks'
import { USDC_ADDRESS } from '@/constant'
import type { OfferingSummary } from '@/types'

const ModalStub = {
  name: 'UModal',
  props: ['open'],
  emits: ['update:open'],
  template: '<div v-if="open"><slot name="content" /></div>'
}

const OFFERING: OfferingSummary = {
  id: '1',
  title: 'Riverside Note',
  rate: 8,
  term: 1,
  termUnit: 'months',
  startDate: '2030-01-01',
  deadlineTimestamp: 1893456000,
  access: 'general',
  raised: 100,
  target: 100,
  totalRepaid: 20,
  status: 'funded',
  token: USDC_ADDRESS
}

// outstanding = 100 + 100*0.08 - 20 = 88 USDC

function mountModal(open = true) {
  return mount(RepayLendersModal, {
    props: { open, offering: OFFERING },
    global: { stubs: { UModal: ModalStub } }
  })
}

describe('RepayLendersModal.vue', () => {
  beforeEach(() => {
    // Treasury (Bank) balance: 200 USDC
    mockERC20Reads.balanceOf.data.value = 200_000000n
    mockERC20Reads.balanceOf.error.value = null

    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('displays the treasury balance from Bank', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('Treasury balance')
    expect(wrapper.text()).toContain('200 USDC')
  })

  it('shows Outstanding and other summary rows', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('Outstanding')
    expect(wrapper.text()).toContain('88 USDC')
  })

  it('submits a repayment via mutate, then refetches treasury balance and closes the modal', async () => {
    mockFixedReturnWrites.repayLenders.mutate.mockImplementation(
      (_vars: unknown, options: { onSuccess?: () => void }) => {
        options?.onSuccess?.()
      }
    )

    const wrapper = mountModal()

    await wrapper.find('[data-test="repay-amount-input"]').setValue(10)
    await wrapper.find('[data-test="repay-confirm-button"]').trigger('click')
    await flushPromises()

    expect(mockFixedReturnWrites.repayLenders.mutate).toHaveBeenCalledWith(
      { args: [1n, 10_000000n] },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(mockERC20Reads.balanceOf.refetch).toHaveBeenCalled()
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['fixedReturnAllOffers'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['fixedReturnOfferLenders'] })
    expect(wrapper.emitted('update:open')).toBeTruthy()
  })

  it('disables the submit button while treasury balance is unavailable', async () => {
    mockERC20Reads.balanceOf.data.value = undefined as unknown as bigint

    const wrapper = mountModal()
    await flushPromises()

    const btn = wrapper.find('[data-test="repay-confirm-button"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('disables the submit button when treasury balance query errored', async () => {
    mockERC20Reads.balanceOf.error.value = new Error('network error')

    const wrapper = mountModal()
    await flushPromises()

    const btn = wrapper.find('[data-test="repay-confirm-button"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('blocks submission when amount exceeds treasury balance', async () => {
    // Treasury = 5 USDC, outstanding = 88 USDC → 10 exceeds treasury only
    mockERC20Reads.balanceOf.data.value = 5_000000n

    const wrapper = mountModal()
    await wrapper.find('[data-test="repay-amount-input"]').setValue(10)
    await wrapper.find('[data-test="repay-confirm-button"]').trigger('click')
    await flushPromises()

    expect(mockFixedReturnWrites.repayLenders.mutate).not.toHaveBeenCalled()
  })

  it('never invokes approve regardless of the amount entered', async () => {
    const wrapper = mountModal()
    await wrapper.find('[data-test="repay-amount-input"]').setValue(10)
    await wrapper.find('[data-test="repay-confirm-button"]').trigger('click')
    await flushPromises()

    expect(mockERC20Writes.approve.mutate).not.toHaveBeenCalled()
  })
})
