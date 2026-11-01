import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { zeroAddress } from 'viem'
import { useGetTeamQuery } from '@/queries/team.queries'
import * as safeQueries from '@/queries/safe.queries'
import * as cowQueries from '@/queries/cow.queries'
import { USDC_ADDRESS } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'
import { mockTeamData } from '@/tests/mocks'
import { useCNCAccounting } from '../useCNCAccounting'

/** The Safe overview reports a $5 P&L on the purchase: the AWETH bought is now worth $24, not $19. */
vi.mock('@/composables/safe/useSafeSwapPnl', () => ({
  useSafeSwapPnl: () => ({
    data: {
      value: {
        count: 1,
        pnlUsd: 5,
        missingPrices: [],
        swaps: [{ txHash: `0x${'1'.padStart(64, '0')}`, pnlUsd: 5 }]
      }
    },
    isLoading: { value: false },
    isError: { value: false }
  })
}))

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
      movement(2, router, safe, token, '10000000000000000')
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
    const cowFee = {
      owner: safe,
      status: 'fulfilled',
      sellToken: USDC_ADDRESS,
      buyToken: token,
      executedFee: '1000000',
      executedFeeToken: USDC_ADDRESS
    }
    const swapOrders = ref<{ txHash: string; isLoading: boolean; data?: (typeof cowFee)[] }[]>([
      { txHash: data.value[1]!.transactionHash, isLoading: true }
    ])
    const orders = vi
      .spyOn(cowQueries, 'useGetCowTransactionOrdersQuery')
      .mockReturnValue(
        swapOrders as unknown as ReturnType<typeof cowQueries.useGetCowTransactionOrdersQuery>
      )
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
    try {
      const accounting = useCNCAccounting('1', {
        rateOfRecord: (asset) => (asset.startsWith('erc20:') ? 0 : 1)
      })
      expect(accounting.status.state.value).toBe('loading')
      swapOrders.value = [
        { txHash: data.value[1]!.transactionHash, isLoading: false, data: [cowFee] }
      ]
      expect(accounting.status.state.value).toBe('ready')
      expect(
        accounting.journal.value.filter((entry) => entry.useCase === 'SAFE-SWAP')
      ).toHaveLength(1)
      const purchase = accounting.journal.value.find(
        (entry) => entry.txHash === data.value[1]!.transactionHash
      )!
      const lineOf = (account: string) =>
        purchase.lines.find((line) => line.account.family.name === account)
      const acquired = purchase.lines.find((line) => line.movement?.asset?.symbol === 'AWETH')
      expect(lineOf('Transaction Fee Expense')?.debit).toBe(10n ** 24n)
      expect(acquired?.debit).toBe(19n * 10n ** 24n)
      expect(acquired?.movement?.rate).toBe(1900000000n)
      expect(lineOf('Swap P&L')?.credit).toBe(5n * 10n ** 24n)
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
      orders.mockRestore()
    }
  })
})
