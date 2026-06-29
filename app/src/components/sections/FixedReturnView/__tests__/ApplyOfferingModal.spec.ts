import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { BaseError, ContractFunctionRevertedError } from 'viem'
import ApplyOfferingModal from '../ApplyOfferingModal.vue'
import {
  mockFixedReturnWrites,
  mockERC20Reads,
  mockERC20Writes,
  mockInvalidateQueries,
  useQueryClientFn
} from '@/tests/mocks'
import { mockToast } from '@/tests/mocks/store.mock'
import { USDC_ADDRESS } from '@/constant'
import type { LenderOffering } from '@/types'

function baseOffering(overrides: Partial<LenderOffering> = {}): LenderOffering {
  return {
    id: '1',
    title: 'Riverside Note',
    rate: 8,
    term: 12,
    termUnit: 'months',
    access: 'general',
    allowed: true,
    cap: null,
    remaining: 70000,
    myDeposited: 0,
    raised: 30000,
    target: 100000,
    token: USDC_ADDRESS,
    accessLabel: 'Open to all',
    accessBg: '#e6f8f1',
    accessColor: '#0a7a52',
    accessDot: '#00bf7a',
    limitsLabel: 'No cap',
    pct: 30,
    ...overrides
  }
}

// ApplyOfferingModal teleports to the real document.body regardless of attachTo —
// a DOMWrapper around document.body is what can actually find that content.
function mountModal(offer: LenderOffering = baseOffering()) {
  const wrapper = mount(ApplyOfferingModal, {
    props: { offer, open: true },
    attachTo: document.body
  })
  return { wrapper, modal: new DOMWrapper(document.body) }
}

describe('ApplyOfferingModal.vue', () => {
  beforeEach(() => {
    mockERC20Reads.allowance.data.value = 1_000_000_000000n
    mockInvalidateQueries.mockClear()
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(() => undefined),
      setQueryData: vi.fn(() => undefined),
      removeQueries: vi.fn(() => undefined)
    })
  })

  // Vue Test Utils doesn't auto-unmount between tests — without this, content
  // left by one test is still in the DOM for the next.
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('updates the open model when the close button is clicked', async () => {
    const { wrapper, modal } = mountModal()
    await modal.find('[data-test="apply-offering-close-button"]').trigger('click')

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('after:leave')).toHaveLength(1)
  })

  it('reports a remaining-cap validation error before submitting', async () => {
    const { modal } = mountModal(baseOffering({ cap: 2000, remaining: 2000 }))
    await modal.find('[data-test="apply-offering-amount-input"]').setValue(3000)

    expect(modal.text()).toContain('Maximum loan amount is 2,000 USDC')
    expect(modal.find('[data-test="apply-offering-remaining"]').text()).toContain(
      'Remaining to lend: 2,000 USDC'
    )
  })

  it('shows the lender-specific remaining amount for a capped offering', () => {
    const { modal } = mountModal(baseOffering({ cap: 2, myDeposited: 0.5, remaining: 1.5 }))

    expect(modal.find('[data-test="apply-offering-remaining"]').text()).toContain(
      'Remaining to lend: 1.5 USDC'
    )
  })

  it('displays the offering token instead of a dollar currency marker', async () => {
    const { modal } = mountModal()
    await modal.find('[data-test="apply-offering-amount-input"]').setValue(1)

    expect(
      modal.find<HTMLInputElement>('[data-test="apply-offering-token-symbol"]').element.value
    ).toBe('USDC')
    expect(modal.text()).toContain('Principal 1 USDC')
    expect(modal.text()).toContain('1.08 USDC')
  })

  it('requires a positive lending amount', () => {
    const { modal } = mountModal()

    expect(modal.text()).toContain('Amount must be greater than 0')
    expect(
      modal.find<HTMLButtonElement>('[data-test="apply-offering-submit-button"]').element.disabled
    ).toBe(true)
  })

  it('skips approve and calls lendFunds when allowance is already sufficient', async () => {
    const { wrapper, modal } = mountModal()
    await modal.find('[data-test="apply-offering-amount-input"]').setValue(1000)

    await modal.find('[data-test="apply-offering-submit-button"]').trigger('click')
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).not.toHaveBeenCalled()
    expect(mockFixedReturnWrites.lendFunds.mutateAsync).toHaveBeenCalledWith({
      args: [1n, 1000_000000n]
    })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'You lent 1,000 USDC to Riverside Note',
        color: 'success'
      })
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['fixedReturnAllOffers']
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['fixedReturnMyLenderPositions']
    })
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('approves the FixedReturn contract before calling lendFunds when allowance is insufficient', async () => {
    mockERC20Reads.allowance.data.value = 0n
    const { modal } = mountModal()
    await modal.find('[data-test="apply-offering-amount-input"]').setValue(1000)

    await modal.find('[data-test="apply-offering-submit-button"]').trigger('click')
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).toHaveBeenCalledWith({
      args: [expect.anything(), 1000_000000n]
    })
    expect(mockFixedReturnWrites.lendFunds.mutateAsync).toHaveBeenCalledWith({
      args: [1n, 1000_000000n]
    })
  })

  it('shows an inline error and does not close when lendFunds is rejected', async () => {
    mockFixedReturnWrites.lendFunds.mutateAsync.mockRejectedValueOnce(
      new Error('User rejected the request')
    )
    const { wrapper, modal } = mountModal()
    await modal.find('[data-test="apply-offering-amount-input"]').setValue(1000)

    await modal.find('[data-test="apply-offering-submit-button"]').trigger('click')
    await flushPromises()

    expect(modal.text()).toContain('User rejected the request')
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('shows a user-facing message for a decoded FixedReturn revert', async () => {
    const revert = new ContractFunctionRevertedError({
      abi: [],
      data: `0x${'00'.repeat(4)}`,
      functionName: 'lendFunds'
    })
    ;(revert as unknown as { data: { errorName: string } }).data = {
      errorName: 'OfferNotOpen'
    }
    mockFixedReturnWrites.lendFunds.mutateAsync.mockRejectedValueOnce(
      new BaseError('reverted', { cause: revert })
    )
    const { modal } = mountModal()
    await modal.find('[data-test="apply-offering-amount-input"]').setValue(1000)

    await modal.find('[data-test="apply-offering-submit-button"]').trigger('click')
    await flushPromises()

    expect(modal.text()).toContain(
      'This offering is closed or its subscription deadline has passed'
    )
  })
})
