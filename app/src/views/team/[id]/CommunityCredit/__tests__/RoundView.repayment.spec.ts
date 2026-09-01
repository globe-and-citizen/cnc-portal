import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { BaseError, ContractFunctionRevertedError } from 'viem'
import type { CreditRound } from '@/types'
import {
  mockBankReads,
  mockBankWrites,
  mockERC20Reads,
  mockFixedReturnReads,
  mockInvalidateQueries,
  mockRouterPush,
  setMockRoute,
  useQueryClientFn
} from '@/tests/mocks'
import { offerStruct, sampleRound } from './communityCreditFixtures'

const MOCK_USER_ADDRESS = '0x0000000000000000000000000000000000000001'
const repaymentLenderData = [
  { address: '0x00000000000000000000000000000000000000a1', principal: 5000, expected: 5250 }
]

const { store } = vi.hoisted(() => {
  const store = {
    isLoading: false,
    isError: false,
    isOwner: true,
    rounds: [] as CreditRound[],
    getRound: (id: string): CreditRound | undefined => store.rounds.find((round) => round.id === id)
  }
  return { store }
})

vi.mock('@/stores/communityCredit', () => ({
  useCommunityCreditStore: () => store
}))

vi.mock('@/components/sections/CommunityCreditView/CreditAccountTransactions.vue', () => ({
  default: { template: '<div data-test="credit-transactions" />' }
}))

import RoundView from '../RoundView.vue'

function mountRound(round: CreditRound, offer = offerStruct(), view = 'repay') {
  store.rounds = [round]
  mockFixedReturnReads.getLendingOffer.data.value = offer
  setMockRoute({ params: { id: '1', roundId: round.id, view } })
  return mount(RoundView)
}

describe('RoundView repayment', () => {
  beforeEach(() => {
    store.isLoading = false
    store.isError = false
    store.isOwner = true
    store.rounds = []
    mockRouterPush.mockClear()
    mockInvalidateQueries.mockClear()
    mockBankWrites.fundFixedReturnRepayment.mutateAsync.mockReset()
    mockBankWrites.fundFixedReturnRepayment.mutateAsync.mockResolvedValue(undefined)
    mockBankReads.owner.data.value = MOCK_USER_ADDRESS
    mockERC20Reads.balanceOf.data.value = 10_000_000000n
    mockERC20Reads.balanceOf.refetch.mockClear()
    mockFixedReturnReads.getLendingOffer.refetch.mockClear()
    mockFixedReturnReads.offerLenders.data.value = repaymentLenderData
    useQueryClientFn.mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  it('renders the repayment tab from its route parameter', async () => {
    const wrapper = mountRound(sampleRound({ status: 'active' }))
    await flushPromises()

    expect(wrapper.text()).toContain('Repayment breakdown')
    expect(wrapper.text()).toContain('5,250')
    expect(wrapper.find('[data-test="confirm-repay"]').exists()).toBe(true)
  })

  it('writes exact units, refreshes the route data, and returns after a full repayment', async () => {
    const wrapper = mountRound(
      sampleRound({ status: 'active' }),
      offerStruct({ totalFunded: 5000_000000n })
    )
    await flushPromises()

    await wrapper.find('[data-test="confirm-repay"]').trigger('click')
    await flushPromises()

    expect(mockBankWrites.fundFixedReturnRepayment.mutateAsync).toHaveBeenCalledWith({
      args: [1n, 5250_000000n]
    })
    expect(mockFixedReturnReads.getLendingOffer.refetch).toHaveBeenCalled()
    expect(mockERC20Reads.balanceOf.refetch).toHaveBeenCalled()
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['fixedReturnOfferLenders'] })
    expect(mockRouterPush).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: 'community-credit-round',
        params: { id: '1', roundId: '1' }
      })
    )
  })

  it('shows a classified repayment failure without refreshing or redirecting', async () => {
    const reverted = new ContractFunctionRevertedError({
      abi: [],
      data: `0x${'00'.repeat(4)}`,
      functionName: 'fundFixedReturnRepayment'
    })
    ;(reverted as unknown as { data: { errorName: string } }).data = {
      errorName: 'SomethingNobodyMapped'
    }
    mockBankWrites.fundFixedReturnRepayment.mutateAsync.mockRejectedValueOnce(
      new BaseError('reverted', { cause: reverted })
    )
    const wrapper = mountRound(
      sampleRound({ status: 'active' }),
      offerStruct({ totalFunded: 5000_000000n })
    )
    await flushPromises()

    await wrapper.find('[data-test="confirm-repay"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="repay-error"]').text()).toContain('Bank action failed')
    expect(mockInvalidateQueries).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('rejects an amount above the exact remaining obligation without writing', async () => {
    const wrapper = mountRound(
      sampleRound({ status: 'active' }),
      offerStruct({ totalFunded: 5000_000000n })
    )
    await flushPromises()

    await wrapper.get('[data-test="repay-amount-input"]').setValue('5250.000001')
    await wrapper.get('[data-test="confirm-repay"]').trigger('click')
    await flushPromises()

    expect(mockBankWrites.fundFixedReturnRepayment.mutateAsync).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="repay-error"]').text()).toContain('outstanding balance')
  })

  it('rejects an amount above the exact Bank balance without writing', async () => {
    mockERC20Reads.balanceOf.data.value = 5000_000000n
    const wrapper = mountRound(
      sampleRound({ status: 'active' }),
      offerStruct({ totalFunded: 5000_000000n })
    )
    await flushPromises()

    await wrapper.get('[data-test="repay-amount-input"]').setValue('5250')
    await wrapper.get('[data-test="confirm-repay"]').trigger('click')
    await flushPromises()

    expect(mockBankWrites.fundFixedReturnRepayment.mutateAsync).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="repay-error"]').text()).toContain('treasury balance')
  })

  it('keeps a partial repayment on the repayment route', async () => {
    const wrapper = mountRound(
      sampleRound({ status: 'active' }),
      offerStruct({ totalFunded: 5000_000000n })
    )
    await flushPromises()

    await wrapper.get('[data-test="repay-amount-input"]').setValue('2000')
    await wrapper.get('[data-test="confirm-repay"]').trigger('click')
    await flushPromises()

    expect(mockBankWrites.fundFixedReturnRepayment.mutateAsync).toHaveBeenCalledWith({
      args: [1n, 2000_000000n]
    })
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})
