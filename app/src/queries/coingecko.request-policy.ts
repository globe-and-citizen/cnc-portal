/** Session-scoped CoinGecko request admission and provider Retry-After policy. */
import { queryClient } from './queryClient'
import { queryPresets } from './queryFactory'
import { retryAfterDelay } from '@/utils/tokens/coingecko'

const COINGECKO_REQUEST_INTERVAL_MS = 6000
const coinGeckoWindowKey = ['coingecko', 'request-window'] as const
// A long provider Retry-After must survive the default inactive-query garbage collection.
queryClient.setQueryDefaults(coinGeckoWindowKey, { ...queryPresets.once, gcTime: Infinity })
let coinGeckoPending: Promise<void> | undefined

interface CoinGeckoRequestWindow {
  nextRequestAt: number
  retryAt: number
}

export class CoinGeckoPausedError extends Error {
  constructor(readonly retryAfterMs: number) {
    super('CoinGecko reads are paused until the provider retry window ends')
  }
}

/** Admit at most one request every six seconds, including across changing target sets. */
export async function waitForCoinGeckoRequest(signal?: AbortSignal): Promise<() => void> {
  while (true) {
    signal?.throwIfAborted()
    const window = queryClient.getQueryData<CoinGeckoRequestWindow>(coinGeckoWindowKey)
    const now = Date.now()
    if (window && window.retryAt > now) throw new CoinGeckoPausedError(window.retryAt - now)
    if (coinGeckoPending) {
      await new Promise<void>((resolve, reject) => {
        const abort = () => reject(signal?.reason)
        signal?.addEventListener('abort', abort, { once: true })
        void coinGeckoPending!.then(() => {
          signal?.removeEventListener('abort', abort)
          resolve()
        })
      })
      continue
    }
    const delay = (window?.nextRequestAt ?? 0) - now
    if (delay <= 0) {
      queryClient.setQueryData<CoinGeckoRequestWindow>(coinGeckoWindowKey, {
        nextRequestAt: now + COINGECKO_REQUEST_INTERVAL_MS,
        retryAt: window?.retryAt ?? 0
      })
      let complete!: () => void
      coinGeckoPending = new Promise<void>((resolve) => {
        complete = resolve
      })
      return () => {
        coinGeckoPending = undefined
        complete()
      }
    }
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer)
        reject(signal?.reason)
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort)
        resolve()
      }, delay)
      signal?.addEventListener('abort', abort, { once: true })
    })
  }
}

export function pauseCoinGeckoRequests(retryAfter: unknown): void {
  const now = Date.now()
  const retryAt = now + retryAfterDelay(retryAfter, now)
  queryClient.setQueryData<CoinGeckoRequestWindow>(coinGeckoWindowKey, (window) => ({
    nextRequestAt: window?.nextRequestAt ?? 0,
    retryAt: Math.max(window?.retryAt ?? 0, retryAt)
  }))
}
