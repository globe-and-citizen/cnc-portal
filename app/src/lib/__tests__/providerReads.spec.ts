import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import apiClient from '@/lib/axios'

describe('Provider read transport', () => {
  let reads: typeof import('../providerReads')
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    reads = await vi.importActual<typeof import('../providerReads')>('../providerReads')
  })
  afterEach(() => vi.useRealTimers())

  it('serializes queued market reads and bypasses the general Axios retry layer', async () => {
    let finish!: () => void
    vi.mocked(apiClient.get)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () => resolve({ data: 1 })
          })
      )
      .mockResolvedValueOnce({ data: 2 })
    const first = reads.readMarket('simple/price?ids=ethereum')
    const second = reads.readMarket('simple/price?ids=usd-coin')
    await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledOnce())
    finish()
    expect((await first).data).toBe(1)
    expect((await second).data).toBe(2)
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      'external/market/simple/price?ids=usd-coin',
      expect.objectContaining({ providerManaged: true })
    )
  })

  it('honors a shared 429 cooldown before starting another queued request', async () => {
    vi.useFakeTimers()
    const error = new AxiosError('limited', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 429,
      headers: { 'retry-after': '120' }
    } as AxiosError['response'])
    vi.mocked(apiClient.get).mockRejectedValueOnce(error)
    await expect(reads.readMarket('simple/price?ids=ethereum')).rejects.toBe(error)
    await expect(reads.readMarket('simple/price?ids=usd-coin')).rejects.toThrow(
      'temporarily paused'
    )
    expect(apiClient.get).toHaveBeenCalledOnce()
    expect(reads.providerInterval('market', 60_000)()).toBeGreaterThanOrEqual(120_000)
    await vi.advanceTimersByTimeAsync(120_001)
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: {} })
    await reads.readMarket('simple/price?ids=usd-coin')
    expect(apiClient.get).toHaveBeenCalledTimes(2)
  })

  it('does not turn a successful wallet operation into a failed write when cache invalidation fails', async () => {
    vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('backend unavailable'))
    await expect(
      reads.invalidateSafeReads(137, '0x1111111111111111111111111111111111111111')
    ).resolves.toBeUndefined()
    expect(apiClient.delete).toHaveBeenCalledWith(
      expect.stringContaining('/cache/'),
      expect.objectContaining({ providerManaged: true })
    )
  })

  it('disables layered retries and background polling while retaining periodic refresh', () => {
    expect(reads.providerQueryPolicy).toMatchObject({
      retry: false,
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false
    })
    expect(reads.providerInterval('safe', 300_000)()).toBe(300_000)
  })
})
