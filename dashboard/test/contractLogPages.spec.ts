import { describe, expect, it, vi } from 'vitest'
import { encodeAbiParameters, encodeEventTopics, type Log } from 'viem'
import { vestingAbi, bankAbi } from '~/artifacts/abi/V2/generated'
import { vestingAbi as vestingV1Abi } from '~/artifacts/abi/V1/generated'
import { fetchContractLogPage, initialLogCursor } from '~/utils/contractLogPages'

const address = '0x1111111111111111111111111111111111111111'
const hash = `0x${'1'.repeat(64)}` as const
function makeLog(topics: Log['topics'], data: Log['data'], blockNumber: bigint, logIndex: number): Log {
  return { address, topics, data, blockNumber, logIndex, transactionHash: hash, blockHash: hash, transactionIndex: 0, removed: false }
}

describe('contract log history pages', () => {
  it('keeps an unrecognized event and reaches genesis on any chain', async () => {
    const unknown = makeLog([`0x${'f'.repeat(64)}`], '0x1234', 3n, 1)
    const readLogs = vi.fn().mockResolvedValue([unknown])
    const page = await fetchContractLogPage(address, initialLogCursor(9n), readLogs)
    expect(readLogs).toHaveBeenCalledWith({ address, fromBlock: 0n, toBlock: 9n })
    expect(page.next).toBeNull()
    expect(page.failed).toBe(false)
    expect(page.rows[0]).toMatchObject({ eventName: 'Unrecognized event', decoded: false, transactionHash: hash, logIndex: 1, args: { data: '0x1234' } })
  })

  it('decodes the V2 Vesting layout instead of dropping it', async () => {
    const topics = encodeEventTopics({ abi: vestingAbi, eventName: 'VestingStopped', args: { member: address } })
    const data = encodeAbiParameters([{ type: 'uint256' }], [7n])
    const page = await fetchContractLogPage(address, initialLogCursor(9n), async () => [makeLog(topics, data, 7n, 2)])
    expect(page.rows[0]).toMatchObject({ eventName: 'VestingStopped', decoded: true, blockNumber: 7n, args: { member: address, index: 7n } })
  })

  it('decodes historical V1 and V2 Bank events with their own indexed fields', async () => {
    const v1Topics = encodeEventTopics({ abi: vestingV1Abi, eventName: 'VestingStopped', args: { member: address, teamId: 4n } })
    const v2Topics = encodeEventTopics({ abi: bankAbi, eventName: 'FixedReturnRepaymentFunded', args: { fixedReturn: address, offerId: 8n, token: address } })
    const page = await fetchContractLogPage(address, initialLogCursor(12n), async () => [
      makeLog(v1Topics, '0x', 2n, 1),
      makeLog(v2Topics, encodeAbiParameters([{ type: 'uint256' }], [42n]), 9n, 3)
    ])
    expect(page.rows.map(row => row.eventName)).toEqual(['FixedReturnRepaymentFunded', 'VestingStopped'])
    expect(page.rows[0]?.args).toMatchObject({ offerId: 8n, amount: 42n })
    expect(page.rows[1]?.args).toMatchObject({ member: address, teamId: 4n })
  })

  it('limits each request batch and continues without overlapping blocks', async () => {
    const readLogs = vi.fn().mockResolvedValue([])
    const first = await fetchContractLogPage(address, initialLogCursor(4_000_000n), readLogs)
    expect(readLogs).toHaveBeenCalledTimes(5)
    expect(first.scannedTo).toBe(4_000_000n)
    expect(first.scannedFrom).toBe(1_500_001n)
    expect(first.next?.toBlock).toBe('1500000')
    const second = await fetchContractLogPage(address, first.next!, readLogs)
    expect(second.scannedTo).toBe(1_500_000n)
    expect(second.next).toBeNull()
  })

  it('reduces the range for provider limits and retains the successful size', async () => {
    const readLogs = vi.fn(async ({ fromBlock, toBlock }: { fromBlock: bigint, toBlock: bigint }) => {
      if (toBlock - fromBlock + 1n > 125_000n) throw new Error('block range too large')
      return []
    })
    const page = await fetchContractLogPage(address, initialLogCursor(1_000_000n), readLogs)
    expect(readLogs).toHaveBeenCalledTimes(7)
    expect(page.failed).toBe(false)
    expect(page.next?.window).toBe('125000')
    expect(page.scannedFrom).toBe(375_001n)
  })

  it('retains successful ranges and retries the failed range without skipping it', async () => {
    const log = makeLog([`0x${'e'.repeat(64)}`], '0x', 900_000n, 1)
    const readLogs = vi.fn().mockResolvedValueOnce([log]).mockRejectedValueOnce(new Error('network unavailable'))
    const page = await fetchContractLogPage(address, initialLogCursor(1_000_000n), readLogs)
    expect(page.failed).toBe(true)
    expect(page.rows).toHaveLength(1)
    expect(page.next?.toBlock).toBe('500000')
    const retry = vi.fn().mockResolvedValue([])
    await fetchContractLogPage(address, page.next!, retry)
    expect(retry.mock.calls[0]![0].toBlock).toBe(500_000n)
  })
})
