import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import {
  mockFixedReturnWrites,
  mockERC20Reads,
  mockERC20Writes,
  mockInvalidateQueries,
  useQueryClientFn
} from '@/tests/mocks'
import { mockToast } from '@/tests/mocks/store.mock'
import CreditLendModal from '../CreditLendModal.vue'
import type { CreditRound } from '@/types'

function sampleRound(overrides: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 23400,
    rate: 5,
    period: 90,
    status: 'open',
    opened: 'Jun 1',
    deadline: 'Jun 28',
    maturity: 'Oct 26',
    restricted: false,
    cap: null,
    desc: 'Working capital.',
    lenders: [],
    ...overrides
  }
}

// CreditLendModal teleports to document.body, so a DOMWrapper is what finds its content.
function mountModal(round: CreditRound | null = sampleRound()) {
  const wrapper = mount(CreditLendModal, { props: { round }, attachTo: document.body })
  return { wrapper, modal: new DOMWrapper(document.body) }
}

describe('CreditLendModal.vue', () => {
  beforeEach(() => {
    mockInvalidateQueries.mockClear()
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  // Teleported content isn't auto-removed between tests.
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('skips approve and calls lendFunds when allowance is already sufficient', async () => {
    const { wrapper, modal } = mountModal()
    await modal.find('[data-test="lend-amount-input"]').setValue(1000)

    await modal.find('[data-test="lend-confirm"]').trigger('click')
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).not.toHaveBeenCalled()
    expect(mockFixedReturnWrites.lendFunds.mutateAsync).toHaveBeenCalledWith({
      args: [1n, 1000_000000n]
    })
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Credit signed — 1,000 USDC sent', color: 'success' })
    )
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['fixedReturnAllOffers'] })
    expect(wrapper.emitted('lent')).toHaveLength(1)
  })

  it('approves the contract before lendFunds when allowance is insufficient', async () => {
    mockERC20Reads.allowance.data.value = 0n
    const { modal } = mountModal()
    await modal.find('[data-test="lend-amount-input"]').setValue(1000)

    await modal.find('[data-test="lend-confirm"]').trigger('click')
    await flushPromises()

    expect(mockERC20Writes.approve.mutateAsync).toHaveBeenCalledWith({
      args: [expect.anything(), 1000_000000n]
    })
    expect(mockFixedReturnWrites.lendFunds.mutateAsync).toHaveBeenCalledWith({
      args: [1n, 1000_000000n]
    })
  })

  it('shows an inline error and does not emit when lendFunds is rejected', async () => {
    mockFixedReturnWrites.lendFunds.mutateAsync.mockRejectedValueOnce(new Error('boom'))
    const { wrapper, modal } = mountModal()
    await modal.find('[data-test="lend-amount-input"]').setValue(1000)

    await modal.find('[data-test="lend-confirm"]').trigger('click')
    await flushPromises()

    expect(modal.find('[data-test="lend-error"]').exists()).toBe(true)
    expect(wrapper.emitted('lent')).toBeUndefined()
  })
})
