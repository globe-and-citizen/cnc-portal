import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createExternalReadQueue, getMarketRead, ExternalReadError } from '../externalReads'
import externalApiClient from '../external.axios'

describe('browser external read coordination', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('paces simultaneous callers without overlapping provider requests', async () => {
    const queue = createExternalReadQueue(2100)
    const request = vi.fn().mockResolvedValue('result')
    const first = queue(request)
    const second = queue(request)
    await first
    expect(request).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(2099)
    expect(request).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(second).resolves.toBe('result')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it.each(['120', 'Thu, 08 Oct 2026 12:02:00 GMT'])(
    'honors Retry-After %s across every caller for the provider',
    async (retryAfter) => {
      const queue = createExternalReadQueue(250)
      const limited = vi.fn().mockRejectedValue(new ExternalReadError(429, retryAfter))
      const next = vi.fn().mockResolvedValue('recovered')
      await expect(queue(limited)).rejects.toMatchObject({ status: 429 })
      await expect(queue(next)).rejects.toMatchObject({ status: 429 })
      expect(next).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(120_000)
      await expect(queue(next)).resolves.toBe('recovered')
    }
  )

  it('pauses Axios reads for a minute when a 429 has no Retry-After', async () => {
    const queue = createExternalReadQueue(250)
    const request = vi.fn().mockRejectedValue({ response: { status: 429 } })
    await expect(queue(request)).rejects.toMatchObject({ response: { status: 429 } })
    await vi.advanceTimersByTimeAsync(59_999)
    await expect(queue(request)).rejects.toMatchObject({ status: 429 })
    expect(request).toHaveBeenCalledTimes(1)
    request.mockResolvedValue('recovered')
    await vi.advanceTimersByTimeAsync(1)
    await expect(queue(request)).resolves.toBe('recovered')
  })

  it('does not send a queued request when its consumer is cancelled', async () => {
    const queue = createExternalReadQueue(250)
    await queue(async () => 'first')
    const controller = new AbortController()
    const request = vi.fn()
    const queued = queue(request, controller.signal)
    const rejected = expect(queued).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    await rejected
    expect(request).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(150)
    await expect(queue(async () => 'next')).resolves.toBe('next')
  })

  it('keeps provider cooldowns independent', async () => {
    const safe = createExternalReadQueue(250)
    const market = createExternalReadQueue(2100)
    await expect(
      safe(async () => {
        throw new ExternalReadError(429)
      })
    ).rejects.toThrow()
    await expect(market(async () => 'price')).resolves.toBe('price')
  })

  it('uses Axios data, cancellation and Retry-After for coordinated market reads', async () => {
    const signal = new AbortController().signal
    const body = { market_data: { current_price: { usd: 2 } } }
    const request = vi.spyOn(externalApiClient, 'get').mockResolvedValueOnce({ data: body })
    try {
      await expect(getMarketRead('https://market.example/coin', signal)).resolves.toEqual({
        data: body
      })
      expect(request).toHaveBeenCalledWith('https://market.example/coin', { signal })
      expect(externalApiClient.defaults.timeout).toBe(15_000)
      await vi.advanceTimersByTimeAsync(2100)
      const failure = { response: { status: 429, headers: { 'retry-after': '120' } } }
      request.mockRejectedValueOnce(failure)
      await expect(getMarketRead('https://market.example/other')).rejects.toBe(failure)
      await expect(getMarketRead('https://market.example/next')).rejects.toMatchObject({
        status: 429
      })
      expect(request).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(120_000)
      request.mockResolvedValueOnce({ data: body })
      await expect(getMarketRead('https://market.example/next')).resolves.toEqual({ data: body })
    } finally {
      request.mockRestore()
    }
  })
})
