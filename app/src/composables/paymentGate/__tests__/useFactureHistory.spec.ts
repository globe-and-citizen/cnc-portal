import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { encodeFunctionData, type Hex } from 'viem'
import { bankAbi } from '@/artifacts/abi/generated'
import { SUPPORTED_TOKENS } from '@/constant'
import { createMockEventFeedState, mockWagmiCore, resetMockEventFeedState } from '@/tests/mocks'
import { useQueriesFn } from '@/tests/mocks/composables.mock'
import type { BankEventFeed } from '@/types/contract-events/bank'
import { empty } from '@/composables/bank/useBankEventsViaLogs'
import { encodeDepositTokenWithFactureId } from '@/utils/paymentGate/factureCalldata'
import { useFactureHistory } from '../useFactureHistory'
import HistoryCard from '@/components/sections/PaymentGateView/HistoryCard.vue'

const bankQuery = createMockEventFeedState<BankEventFeed>()
vi.mock('@/composables/bank/useBankEventsViaLogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/composables/bank/useBankEventsViaLogs')>()),
  useBankEventsViaLogs: () => bankQuery
}))

const { useQueries } =
  await vi.importActual<typeof import('@tanstack/vue-query')>('@tanstack/vue-query')
const actualViem = await vi.importActual<typeof import('viem')>('viem')
const BANK = '0x1111111111111111111111111111111111111111'
const OTHER_BANK = '0x2222222222222222222222222222222222222222'
const FIRST = `0x${'a'.repeat(64)}` as Hex
const SECOND = `0x${'b'.repeat(64)}` as Hex
const THIRD = `0x${'c'.repeat(64)}` as Hex
const token = SUPPORTED_TOKENS.find(({ symbol }) => symbol === 'USDC')!
const getTransaction = vi.fn()
let wrapper: VueWrapper
let client: QueryClient

function deposit(hash: Hex, bank = BANK) {
  return {
    id: `${hash}-0`,
    contractAddress: bank,
    depositor: OTHER_BANK,
    token: token.address,
    amount: '1000000',
    timestamp: 1_700_000_000
  }
}
function feed(hashes: Hex[], bank = BANK) {
  return { ...empty(), bankTokenDeposits: { items: hashes.map((hash) => deposit(hash, bank)) } }
}
function calldata(factureId: string) {
  return encodeDepositTokenWithFactureId({ token: token.address, amount: 1000000n, factureId })
}
function setup() {
  let history!: ReturnType<typeof useFactureHistory>
  wrapper = mount(
    defineComponent({
      setup() {
        history = useFactureHistory(ref(BANK))
        return () => h('div')
      }
    }),
    { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } }
  )
  return history
}
async function expectState(history: ReturnType<typeof useFactureHistory>, state: string) {
  await vi.waitFor(() => expect(history.status.value.state).toBe(state))
}

beforeEach(() => {
  vi.clearAllMocks()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useQueriesFn.mockImplementation(useQueries)
  vi.mocked(encodeFunctionData).mockImplementation(actualViem.encodeFunctionData)
  resetMockEventFeedState(bankQuery, feed([FIRST, SECOND]))
  getTransaction.mockReset().mockImplementation(async ({ hash }: { hash: Hex }) => {
    if (hash === SECOND) throw new Error('Transaction lookup unavailable')
    return { input: calldata('invoice-1') }
  })
  mockWagmiCore.getPublicClient.mockReturnValue({ getTransaction })
})
afterEach(() => {
  wrapper?.unmount()
  client.clear()
})

describe('Payment history with real query observers and facture decoding', () => {
  it('keeps resolved payments and identifies unresolved transactions after a partial failure', async () => {
    const history = setup()
    await expectState(history, 'partial')
    expect(history.data.value.unresolvedHashes).toEqual([SECOND])
    expect(history.data.value.payments).toMatchObject([
      { factureId: 'invoice-1', txHash: FIRST, amount: '1', token: 'USDC' }
    ])
    expect(history.status.value.error?.message).toBe('Transaction lookup unavailable')
  })

  it('retries only missing calldata and clears incompleteness after recovery', async () => {
    const history = setup()
    await expectState(history, 'partial')
    getTransaction.mockImplementation(async ({ hash }: { hash: Hex }) => ({
      input: calldata(hash === FIRST ? 'invoice-1' : 'invoice-2')
    }))
    await history.refetch()
    await expectState(history, 'complete')
    expect(history.data.value.payments.map(({ factureId }) => factureId)).toEqual([
      'invoice-1',
      'invoice-2'
    ])
    expect(history.data.value.unresolvedHashes).toEqual([])
    expect(history.status.value.error).toBeNull()
    expect(getTransaction.mock.calls.map(([args]) => args.hash)).toEqual([FIRST, SECOND, SECOND])
    expect(bankQuery.refetch).not.toHaveBeenCalled()
  })

  it('retains successful rows when another explicit retry fails', async () => {
    const history = setup()
    await expectState(history, 'partial')
    await history.refetch()
    await expectState(history, 'partial')
    expect(history.data.value.payments).toHaveLength(1)
    expect(history.data.value.unresolvedHashes).toEqual([SECOND])
    expect(getTransaction).toHaveBeenCalledTimes(3)
  })

  it('reports all failed reads as unavailable and recovers them on retry', async () => {
    getTransaction.mockRejectedValue(new Error('RPC unavailable'))
    const history = setup()
    await expectState(history, 'unavailable')
    expect(history.data.value.payments).toEqual([])
    expect(history.data.value.unresolvedHashes).toEqual([FIRST, SECOND])
    getTransaction.mockResolvedValue({ input: calldata('recovered') })
    await history.refetch()
    await expectState(history, 'complete')
    expect(history.data.value.payments).toHaveLength(2)
  })

  it('keeps an unavailable public client as a retryable error', async () => {
    mockWagmiCore.getPublicClient.mockReturnValue(undefined)
    const history = setup()
    await expectState(history, 'unavailable')
    expect(history.status.value.error?.message).toContain('No public client')
    expect(history.data.value.unresolvedHashes).toEqual([FIRST, SECOND])
    expect(getTransaction).not.toHaveBeenCalled()
  })

  it('does not classify missing transaction input as a confirmed plain deposit', async () => {
    resetMockEventFeedState(bankQuery, feed([FIRST]))
    getTransaction.mockResolvedValue({})
    const history = setup()
    await expectState(history, 'unavailable')
    expect(history.data.value.unresolvedHashes).toEqual([FIRST])
    getTransaction.mockResolvedValue({ input: calldata('recovered') })
    await history.refetch()
    await expectState(history, 'complete')
    expect(history.data.value.payments[0]?.factureId).toBe('recovered')
  })

  it('deduplicates lookups for multiple deposit events in the same transaction', async () => {
    const source = feed([FIRST])
    source.bankTokenDeposits.items.push({ ...deposit(FIRST), id: `${FIRST}-1` })
    resetMockEventFeedState(bankQuery, source)
    const history = setup()
    await expectState(history, 'complete')
    expect(history.data.value.payments).toHaveLength(2)
    expect(getTransaction).toHaveBeenCalledOnce()
  })

  it('keeps loaded payments while a retry is pending and deduplicates repeated retries', async () => {
    const history = setup()
    await expectState(history, 'partial')
    let resolve!: (value: { input: Hex }) => void
    getTransaction.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      })
    )
    const retry = history.refetch()
    await vi.waitFor(() => expect(history.status.value.fetching).toBe(true))
    expect(history.data.value.payments).toHaveLength(1)
    await history.refetch()
    expect(getTransaction).toHaveBeenCalledTimes(3)
    resolve({ input: calldata('recovered') })
    await retry
    await expectState(history, 'complete')
    expect(history.data.value.payments).toHaveLength(2)
  })

  it('[AC-US-PAYGATE-004-04] excludes a successfully resolved plain deposit without marking it unresolved', async () => {
    resetMockEventFeedState(bankQuery, feed([FIRST]))
    getTransaction.mockResolvedValue({
      input: actualViem.encodeFunctionData({
        abi: bankAbi,
        functionName: 'depositToken',
        args: [token.address, 1000000n]
      })
    })
    const history = setup()
    await expectState(history, 'complete')
    expect(history.data.value.payments).toEqual([])
    expect(history.data.value.unresolvedHashes).toEqual([])
  })

  it('shares successful calldata when a new deposit appears or the view remounts', async () => {
    resetMockEventFeedState(bankQuery, feed([FIRST]))
    const history = setup()
    await expectState(history, 'complete')
    resetMockEventFeedState(bankQuery, feed([FIRST, THIRD]))
    await vi.waitFor(() => expect(history.data.value.payments).toHaveLength(2))
    expect(getTransaction.mock.calls.map(([args]) => args.hash)).toEqual([FIRST, THIRD])
    wrapper.unmount()
    const remounted = setup()
    await expectState(remounted, 'complete')
    expect(getTransaction).toHaveBeenCalledTimes(2)
  })

  it('does not mix transaction results when the Bank feed changes during a lookup', async () => {
    let resolve!: (value: { input: Hex }) => void
    getTransaction.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      })
    )
    resetMockEventFeedState(bankQuery, feed([FIRST]))
    const history = setup()
    await vi.waitFor(() => expect(getTransaction).toHaveBeenCalledOnce())
    resetMockEventFeedState(bankQuery, feed([THIRD], OTHER_BANK))
    await expectState(history, 'complete')
    expect(history.data.value.payments.map(({ txHash, to }) => [txHash, to])).toEqual([
      [THIRD, OTHER_BANK]
    ])
    resolve({ input: calldata('previous-bank') })
    await flushPromises()
    expect(history.data.value.payments.map(({ txHash }) => txHash)).toEqual([THIRD])
  })

  it.each(['gaps', 'timestampGaps'] as const)(
    'preserves Bank %s and retries that source without rereading successful calldata',
    async (field) => {
      resetMockEventFeedState(bankQuery, feed([FIRST]))
      if (field === 'gaps')
        bankQuery.data.value!.gaps = [{ address: BANK, error: new Error('Logs missing') }]
      else
        bankQuery.data.value!.timestampGaps = [
          { transactionHash: FIRST, blockNumber: 1n, reason: 'block-unavailable' }
        ]
      const history = setup()
      await vi.waitFor(() => expect(history.data.value.payments).toHaveLength(1))
      expect(history.status.value.state).toBe('partial')
      bankQuery.refetch.mockImplementationOnce(async () => {
        bankQuery.data.value = { events: feed([FIRST]), gaps: [], timestampGaps: [] }
      })
      await history.refetch()
      await expectState(history, 'complete')
      expect(bankQuery.refetch).toHaveBeenCalledOnce()
      expect(getTransaction).toHaveBeenCalledOnce()
    }
  )

  it('retains resolved payments when the Bank source refresh fails', async () => {
    resetMockEventFeedState(bankQuery, feed([FIRST]))
    const history = setup()
    await expectState(history, 'complete')
    bankQuery.error.value = new Error('Bank refresh failed')
    await expectState(history, 'partial')
    expect(history.data.value.payments).toHaveLength(1)
    await history.refetch()
    expect(bankQuery.refetch).toHaveBeenCalledOnce()
    expect(getTransaction).toHaveBeenCalledOnce()
  })
})

describe('Merchant payment-history recovery with the real producer', () => {
  function renderCard() {
    wrapper = mount(HistoryCard, {
      global: { plugins: [[VueQueryPlugin, { queryClient: client }]] }
    })
  }

  it('[AC-US-PAYGATE-004-07] keeps resolved payments visible and recovers missing transactions through Try again', async () => {
    renderCard()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Transaction history is incomplete'))
    expect(wrapper.text()).toContain('invoice-1')
    expect(wrapper.text()).not.toContain('No payments yet.')
    getTransaction.mockImplementation(async ({ hash }: { hash: Hex }) => ({
      input: calldata(hash === FIRST ? 'invoice-1' : 'invoice-2')
    }))
    await wrapper.get('[data-test="payment-gate-history-warning-retry"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('invoice-2'))
    expect(wrapper.text()).toContain('invoice-1')
    expect(wrapper.find('[data-test="payment-gate-history-warning"]').exists()).toBe(false)
    expect(getTransaction.mock.calls.map(([args]) => args.hash)).toEqual([FIRST, SECOND, SECOND])
  })

  it('[AC-US-PAYGATE-004-06] shows unavailable history rather than a confirmed empty state when every lookup fails', async () => {
    getTransaction.mockRejectedValue(new Error('RPC unavailable'))
    renderCard()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Transaction history unavailable'))
    expect(wrapper.text()).not.toContain('No payments yet.')
    expect(wrapper.get('[data-test="payment-gate-history-warning-retry"]').text()).toContain(
      'Try again'
    )
  })

  it('[AC-US-PAYGATE-004-05] shows the true empty state after a complete empty Bank read', async () => {
    resetMockEventFeedState(bankQuery, empty())
    renderCard()
    await vi.waitFor(() => expect(wrapper.text()).toContain('No payments yet.'))
    expect(wrapper.find('[data-test="payment-gate-history-warning"]').exists()).toBe(false)
    expect(getTransaction).not.toHaveBeenCalled()
  })
})
