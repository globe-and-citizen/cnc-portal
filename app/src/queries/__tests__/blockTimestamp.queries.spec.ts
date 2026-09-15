import { QueryClient } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
import { blockTimestampKeys, fetchBlockTimestamp } from '../blockTimestamp.queries'

describe('block timestamp queries', () => {
  it('keys immutable timestamps by chain and block number', () => {
    expect(blockTimestampKeys.timestamp(137, 42n)).toEqual([
      'block-timestamp',
      { chainId: 137, blockNumber: '42' }
    ])
    expect(blockTimestampKeys.timestamp(1, 42n)).not.toEqual(blockTimestampKeys.timestamp(137, 42n))
  })

  it('shares one immutable block read across concurrent and later callers', async () => {
    const queryClient = new QueryClient()
    const getBlock = vi.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({
      number: blockNumber,
      timestamp: 1_700_000_000n
    }))
    const client = { getBlock }

    const [first, concurrent] = await Promise.all([
      fetchBlockTimestamp(queryClient, client, 137, 42n),
      fetchBlockTimestamp(queryClient, client, 137, 42n)
    ])
    const cached = await fetchBlockTimestamp(queryClient, client, 137, 42n)

    expect(first).toBe(1_700_000_000)
    expect(concurrent).toBe(first)
    expect(cached).toBe(first)
    expect(getBlock).toHaveBeenCalledTimes(1)
  })

  it('does not share a timestamp across different chains', async () => {
    const queryClient = new QueryClient()
    const getBlock = vi
      .fn()
      .mockResolvedValueOnce({ number: 42n, timestamp: 1_700_000_000n })
      .mockResolvedValueOnce({ number: 42n, timestamp: 1_800_000_000n })
    const client = { getBlock }

    const polygon = await fetchBlockTimestamp(queryClient, client, 137, 42n)
    const ethereum = await fetchBlockTimestamp(queryClient, client, 1, 42n)

    expect(polygon).toBe(1_700_000_000)
    expect(ethereum).toBe(1_800_000_000)
    expect(getBlock).toHaveBeenCalledTimes(2)
  })
})
