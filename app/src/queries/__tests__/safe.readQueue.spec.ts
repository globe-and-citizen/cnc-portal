import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SAFE_READ_SPACING_MS, queueSafeRead } from '../safe.readQueue'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('queueSafeRead', () => {
  beforeEach(() => vi.useFakeTimers())

  afterEach(async () => {
    await vi.runAllTimersAsync()
    vi.useRealTimers()
  })

  it('starts the next read only after the previous one settles', async () => {
    const first = deferred<string>()
    const second = vi.fn().mockResolvedValue('second')

    const firstResult = queueSafeRead(() => first.promise)
    queueSafeRead(second)
    await vi.advanceTimersByTimeAsync(SAFE_READ_SPACING_MS * 4)
    expect(second).not.toHaveBeenCalled()

    first.resolve('first')
    await expect(firstResult).resolves.toBe('first')
    await vi.advanceTimersByTimeAsync(0)
    expect(second).toHaveBeenCalledOnce()
  })

  it('keeps the spacing between two fast reads', async () => {
    const first = vi.fn().mockResolvedValue('first')
    const second = vi.fn().mockResolvedValue('second')

    queueSafeRead(first)
    queueSafeRead(second)
    await vi.advanceTimersByTimeAsync(SAFE_READ_SPACING_MS - 1)
    expect(first).toHaveBeenCalledOnce()
    expect(second).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(second).toHaveBeenCalledOnce()
  })

  it('lets the next read run after a failed one and returns each own outcome', async () => {
    const failure = new Error('Too many requests per second')

    const failed = queueSafeRead(() => Promise.reject(failure))
    const next = queueSafeRead(() => Promise.resolve('next'))
    const outcome = expect(failed).rejects.toBe(failure)
    await vi.advanceTimersByTimeAsync(SAFE_READ_SPACING_MS)

    await outcome
    await expect(next).resolves.toBe('next')
  })
})
