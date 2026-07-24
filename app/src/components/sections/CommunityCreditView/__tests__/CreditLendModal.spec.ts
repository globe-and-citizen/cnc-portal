import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import {
  mockFixedReturnReads,
  mockFixedReturnWrites,
  mockERC20Reads,
  mockERC20Writes,
  mockInvalidateQueries,
  useQueryClientFn
} from '@/tests/mocks'
import { mockToast } from '@/tests/mocks/store.mock'
import { USDC_ADDRESS } from '@/constant'
import { MINUTES_PER_DAY } from '@/utils'
import CreditLendModal from '../CreditLendModal.vue'
import type { CreditRound, LendingOfferStruct } from '@/types'

function offerStruct(over: Partial<LendingOfferStruct> = {}): LendingOfferStruct {
  return {
    token: USDC_ADDRESS,
    fundingTarget: 40_000_000000n,
    interestRateBps: 500n,
    maturityDate: 1_700_000_000n + BigInt(90 * 86_400),
    subscriptionDeadline: 1_700_000_000n,
    fundingAccess: 0,
    isCapEnabled: false,
    lenderCap: 0n,
    totalFunded: 23_400_000000n,
    totalRepaidByIssuer: 0n,
    state: 0,
    ...over
  }
}

function sampleRound(overrides: Partial<CreditRound> = {}): CreditRound {
  return {
    id: '1',
    name: 'Q3 runway bridge',
    token: 'USDC',
    target: 40000,
    raised: 23400,
    totalRepaid: 0,
    rate: 5,
    period: 90 * MINUTES_PER_DAY,
    termLabel: '90 days',
    status: 'open',
    fundable: true,
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
    mockFixedReturnReads.getLendingOffer.data.value = null
    mockFixedReturnReads.myLenderPositions.data.value = new Map()
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

  describe('personal limit accuracy', () => {
    it('shows the whitelist allocation as the cap, not the (irrelevant) general lenderCap', async () => {
      mockFixedReturnReads.getLendingOffer.data.value = offerStruct({
        fundingAccess: 1, // whitelist
        isCapEnabled: false // general cap unset — would wrongly read as "No cap" pre-fix
      })
      mockFixedReturnReads.myLenderPositions.data.value = new Map([
        [1, { allocation: 5000_000000n, deposited: 0n }]
      ])
      const { modal } = mountModal(sampleRound({ restricted: true, cap: null }))
      await flushPromises()

      expect(modal.find('[data-test="lend-cap"]').text()).toContain('5,000 USDC')
    })

    it('subtracts what was already deposited, sourced live rather than from the (possibly empty) round.lenders prop', async () => {
      mockFixedReturnReads.getLendingOffer.data.value = offerStruct({
        isCapEnabled: true,
        lenderCap: 10000_000000n
      })
      mockFixedReturnReads.myLenderPositions.data.value = new Map([
        [1, { allocation: 0n, deposited: 4000_000000n }]
      ])
      // lenders: [] simulates opening the modal from the Index list, where the round
      // prop is never enriched with lender positions.
      const { modal } = mountModal(sampleRound({ cap: 10000, lenders: [] }))
      await flushPromises()

      expect(modal.find('[data-test="lend-cap"]').text()).toContain('6,000 USDC')
    })

    it('bases Max on the personal remaining, not just the funding remaining', async () => {
      mockFixedReturnReads.getLendingOffer.data.value = offerStruct({
        isCapEnabled: true,
        lenderCap: 3000_000000n,
        totalFunded: 0n
      })
      mockFixedReturnReads.myLenderPositions.data.value = new Map([
        [1, { allocation: 0n, deposited: 0n }]
      ])
      // Funding-level remaining is 40,000; the lender's own cap of 3,000 is the tighter bound.
      const { modal } = mountModal(sampleRound({ target: 40000, raised: 0, cap: 3000 }))
      await flushPromises()

      await modal.find('[data-test="lend-quick-Max"]').trigger('click')
      expect(
        (modal.find('[data-test="lend-amount-input"]').element as HTMLInputElement).value
      ).toBe('3000')
    })

    it('scales 25%/50% off the actual personal max, not the round-level gap clamped afterward', async () => {
      mockFixedReturnReads.getLendingOffer.data.value = offerStruct({
        isCapEnabled: true,
        lenderCap: 3000_000000n,
        totalFunded: 0n
      })
      mockFixedReturnReads.myLenderPositions.data.value = new Map([
        [1, { allocation: 0n, deposited: 0n }]
      ])
      // Funding-level remaining is 40,000; the lender's own cap of 3,000 is the tighter bound.
      // 25%/50% of the round-level 40,000 would both clamp to 3,000 (same as Max) — they
      // must instead be 25%/50% of the lender's actual 3,000 ceiling: 750 and 1,500.
      const { modal } = mountModal(sampleRound({ target: 40000, raised: 0, cap: 3000 }))
      await flushPromises()

      await modal.find('[data-test="lend-quick-25%"]').trigger('click')
      expect(
        (modal.find('[data-test="lend-amount-input"]').element as HTMLInputElement).value
      ).toBe('750')

      await modal.find('[data-test="lend-quick-50%"]').trigger('click')
      expect(
        (modal.find('[data-test="lend-amount-input"]').element as HTMLInputElement).value
      ).toBe('1500')
    })

    it('shows a fractional remaining/cap precisely instead of rounding it up to a whole number', async () => {
      mockFixedReturnReads.getLendingOffer.data.value = offerStruct({
        isCapEnabled: true,
        lenderCap: 1_000000n // 1 USDC cap
      })
      mockFixedReturnReads.myLenderPositions.data.value = new Map([
        [1, { allocation: 0n, deposited: 500000n }] // already deposited 0.5 USDC
      ])
      const { modal } = mountModal(sampleRound({ cap: 1 }))
      await flushPromises()

      // 1 - 0.5 = 0.5 left — must not round up to "1", the exact bug this fix closes.
      expect(modal.find('[data-test="lend-cap"]').text()).toContain('0.5 USDC')
      expect(modal.find('[data-test="lend-remaining"]').text()).toContain('0.5 USDC')
    })

    it('does not collapse a small preset amount to 0 (50% of 0.4 is 0.2, not 0)', async () => {
      mockFixedReturnReads.getLendingOffer.data.value = offerStruct({
        fundingTarget: 400000n, // 0.4 USDC target
        totalFunded: 0n
      })
      mockFixedReturnReads.myLenderPositions.data.value = new Map([
        [1, { allocation: 0n, deposited: 0n }]
      ])
      const { modal } = mountModal(sampleRound({ target: 0.4, raised: 0, cap: null }))
      await flushPromises()

      await modal.find('[data-test="lend-quick-50%"]').trigger('click')
      expect(
        (modal.find('[data-test="lend-amount-input"]').element as HTMLInputElement).value
      ).toBe('0.2')
    })
  })
})
