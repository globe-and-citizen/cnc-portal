import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import { zeroAddress } from 'viem'
import { useGetTeamQuery } from '@/queries/team.queries'
import * as safeQueries from '@/queries/safe.queries'
import * as historicalRateQueries from '@/queries/coingecko.queries'
import { USDC_ADDRESS } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'
import { mockTeamData } from '@/tests/mocks'
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
    const rates = vi.spyOn(historicalRateQueries, 'useHistoricalTokenRatesQuery').mockReturnValue({
      rateOfRecord: (asset) => (asset.startsWith('erc20:') ? marketRate.value : 1),
      isLoading: ref(false),
      refetch: vi.fn().mockResolvedValue(undefined)
    })
    try {
      const accounting = useCNCAccounting('1')
      expect(accounting.status.state.value).toBe('partial')
      expect(toValue(rates.mock.calls.at(-1)![0])).toContainEqual({
        token: expect.stringContaining('erc20:'),
        date: '2026-06-01'
      })
      marketRate.value = 1800
      expect(
        accounting.journal.value.filter((entry) => entry.useCase === 'SAFE-SWAP')
      ).toHaveLength(2)
      const purchase = accounting.journal.value.find(
        (entry) => entry.txHash === data.value[1]!.transactionHash
      )!
      expect(
        purchase.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')?.movement?.rate
      ).toBe(1800000000n)
      expect(
        purchase.lines.some((line) => line.account.family.name === 'Asset Exchange Loss')
      ).toBe(true)
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
      rates.mockRestore()
    }
  })
})
