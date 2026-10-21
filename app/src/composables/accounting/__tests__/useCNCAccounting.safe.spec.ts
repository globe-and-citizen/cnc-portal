import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref, toValue } from 'vue'
import { zeroAddress } from 'viem'
import { useGetTeamQuery } from '@/queries/team.queries'
import * as safeQueries from '@/queries/safe.queries'
import { USDC_ADDRESS } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'
import { mockTeamData, useQueriesFn } from '@/tests/mocks'
import { swapFeeFixture, HASH } from '@/utils/accounting/__tests__/swapFeeFixtures'
import { history } from '@/utils/accounting/__tests__/safeExchangeFixtures'
import { ADDR, usd } from '@/utils/accounting/__tests__/fixtures'
import { useCNCAccounting } from '../useCNCAccounting'

describe('Safe exchanges in the Accounting data layer', () => {
  beforeEach(() => vi.clearAllMocks())
  it('refreshes discovered Safe exchanges into the shared journal and flags an ancillary mint', async () => {
    const safe = '0x1111111111111111111111111111111111111111'
    const router = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    const token = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const movement = (
      n: number,
      from: string,
      to: string,
      address: string,
      value: string
    ): SafeIncomingTransfer => ({
      type: 'ERC20_TRANSFER',
      transferId: String(n),
      transactionHash: `0x${String(Math.ceil(n / 2)).padStart(64, '0')}`,
      executionDate: `2026-06-${String(Math.max(1, Math.ceil(n / 2))).padStart(2, '0')}T12:00:00Z`,
      blockNumber: n,
      from,
      to,
      tokenAddress: address,
      value,
      tokenInfo: {
        type: 'ERC20',
        address,
        name: 'Asset',
        symbol: address === token ? 'AWETH' : 'USDC',
        decimals: address === token ? 18 : 6,
        trusted: true
      }
    })
    const data = ref([
      movement(0, router, safe, USDC_ADDRESS, '20000000'),
      movement(1, safe, router, USDC_ADDRESS, '20000000'),
      movement(2, router, safe, token, '10000000000000000'),
      movement(3, safe, router, token, '10000000000000000'),
      movement(4, router, safe, USDC_ADDRESS, '30000000')
    ])
    // Deposit gets its own operation; each pair shares one mined swap hash.
    data.value[0]!.transactionHash = `0x${'9'.repeat(64)}`
    const refetch = vi.fn().mockResolvedValue(undefined)
    const feed = vi.spyOn(safeQueries, 'useGetSafeTransfersQuery').mockReturnValue({
      data,
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(null),
      refetch
    } as unknown as ReturnType<typeof safeQueries.useGetSafeTransfersQuery>)
    vi.mocked(useGetTeamQuery).mockReturnValue({
      data: ref({
        ...mockTeamData,
        safeAddress: safe,
        teamContracts: [{ address: safe, type: 'Safe' }]
      }),
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useGetTeamQuery>)
    const marketRate = ref(0)
    try {
      const accounting = useCNCAccounting('1', {
        rateOfRecord: (asset) => (asset.startsWith('erc20:') ? marketRate.value : 1)
      })
      // Stablecoin execution amounts establish cost even without a crypto market quote.
      expect(accounting.status.state.value).toBe('ready')
      const fixedJournal = accounting.journal.value
      marketRate.value = 1800
      expect(accounting.journal.value).toEqual(fixedJournal)
      expect(
        accounting.journal.value.filter((entry) => entry.useCase === 'SAFE-SWAP')
      ).toHaveLength(2)
      const purchase = accounting.journal.value.find(
        (entry) => entry.txHash === data.value[1]!.transactionHash
      )!
      expect(
        purchase.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.movement?.rate
      ).toBe(2000000000n)
      expect(
        purchase.lines.some((line) => line.account.family.name === 'Asset Exchange Loss')
      ).toBe(false)
      expect(accounting.status.state.value).toBe('ready')
      await accounting.refetch()
      expect(refetch).toHaveBeenCalledOnce()
      const mint = movement(5, zeroAddress, safe, token, '1')
      data.value.push(mint)
      expect(accounting.status.state.value).toBe('partial')
      expect(
        accounting.status.diagnostics.value.some(
          (diagnostic) => diagnostic.kind === 'unclassified-asset-movement'
        )
      ).toBe(true)
    } finally {
      feed.mockRestore()
    }
  })
  it('[AC-US-ACCT-002-15] keeps the fee inside the cost until verified, then posts net assets and a separate fee expense', () => {
    const { order, trade, execution } = swapFeeFixture()
    order.sellToken = order.executedFeeToken = trade.sellToken = USDC_ADDRESS.toLowerCase()
    const feesAvailable = ref(false)
    const rows = history().slice(0, 3)
    rows[0]!.value = rows[1]!.value = trade.sellAmount
    rows[2]!.value = trade.buyAmount
    rows[1]!.transactionHash = rows[2]!.transactionHash = HASH
    useQueriesFn.mockImplementation(({ queries, combine }) =>
      computed(() => {
        const results = toValue(queries).map((query) => {
          const key = query.queryKey
          const data =
            key[0] === 'swap-execution'
              ? { ...execution, cowTrades: [trade] }
              : key[0] === 'cow-orders'
                ? feesAvailable.value
                  ? [order]
                  : []
                : key[0] === 'cow-trades'
                  ? [trade]
                  : { market_data: { current_price: { usd: 1 } } }
          return { data, isFetching: false, isError: false, refetch: vi.fn() }
        })
        return combine ? combine(results) : results
      })
    )
    const feed = vi.spyOn(safeQueries, 'useGetSafeTransfersQuery').mockReturnValue({
      data: ref(rows),
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof safeQueries.useGetSafeTransfersQuery>)
    vi.mocked(useGetTeamQuery).mockReturnValue({
      data: ref({
        ...mockTeamData,
        safeAddress: ADDR.safe,
        teamContracts: [{ address: ADDR.safe, type: 'Safe' }]
      }),
      isLoading: ref(false),
      isPending: ref(false),
      error: ref(null),
      refetch: vi.fn()
    } as unknown as ReturnType<typeof useGetTeamQuery>)
    const line = (name: string) =>
      accounting.journal.value
        .find((entry) => entry.useCase === 'SAFE-SWAP')!
        .lines.find((line) => line.account.family.name === name && line.debit !== undefined)
    const accounting = useCNCAccounting('1', { scope: 'safe' })
    try {
      expect(accounting.status.state.value).toBe('ready')
      expect(accounting.status.diagnostics.value).toEqual([])
      expect(line('Cash — Safe')?.debit).toBe(usd('532.94425'))
      expect(line('Transaction Fee Expense')).toBeUndefined()
      expect(accounting.swapFees.value[0]!.verification.fees).toBeNull()
      feesAvailable.value = true
      expect(accounting.status.state.value).toBe('ready')
      expect(line('Cash — Safe')?.debit).toBe(usd('529.073756'))
      expect(line('Transaction Fee Expense')?.debit).toBe(usd('3.870494'))
      expect(
        accounting.status.sources.value.find((source) => source.source === 'weekly-claims')?.state
      ).toBe('not-applicable')
    } finally {
      feed.mockRestore()
    }
  })
})
