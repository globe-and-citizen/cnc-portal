/** Production provider reads use the backend; signed Safe writes stay in their existing owner. */
import { isAxiosError } from 'axios'
import apiClient, { type ProviderManagedRequestConfig } from './axios'
import externalApiClient from './external.axios'
import { TX_SERVICE_BY_CHAIN } from '@/types/safe'

const pauses = new Map<'safe' | 'market', number>()
const tails = new Map<string, Promise<unknown>>()
let nextSafeLane = 0

async function coordinated<T>(provider: 'safe' | 'market', work: () => Promise<T>): Promise<T> {
  // Two Safe lanes let live info load while a complete history is being synchronized.
  const lane = provider === 'safe' ? `safe-${nextSafeLane++ % 2}` : 'market'
  const previous = tails.get(lane) ?? Promise.resolve()
  const operation = previous
    .catch(() => undefined)
    .then(async () => {
      if ((pauses.get(provider) ?? 0) > Date.now())
        throw new Error('Provider reads are temporarily paused')
      try {
        return await work()
      } catch (error) {
        if (isAxiosError(error) && [429, 503].includes(error.response?.status ?? 0)) {
          const seconds = Number(error.response?.headers?.['retry-after'] ?? 60)
          pauses.set(
            provider,
            Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 60) * 1000
          )
        }
        throw error
      }
    })
  tails.set(
    lane,
    operation.catch(() => undefined)
  )
  return operation
}

export const providerQueryPolicy = {
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchIntervalInBackground: false
}

export function providerInterval(provider: 'safe' | 'market', milliseconds: number) {
  return () => Math.max(milliseconds, (pauses.get(provider) ?? 0) - Date.now())
}

export function readSafe<T>(chainId: number, upstream: string, signal?: AbortSignal) {
  // The isolated Hardhat fixture is a local test adapter, not a production API bypass.
  if (chainId === 31337 && import.meta.env.VITE_E2E === 'true') {
    return externalApiClient.get<T>(upstream, { signal })
  }
  const base = TX_SERVICE_BY_CHAIN[chainId]?.url
  if (!base) return Promise.reject(new Error('Unsupported Safe network'))
  const url = new URL(upstream)
  const origin = new URL(base)
  if (url.origin !== origin.origin) return Promise.reject(new Error('Invalid Safe read target'))
  const config: ProviderManagedRequestConfig = { providerManaged: true, signal }
  return coordinated('safe', () =>
    apiClient.get<T>(`external/safe/${chainId}${url.pathname}${url.search}`, config)
  )
}

export async function invalidateSafeReads(chainId: number, address: string) {
  if (chainId === 31337 && import.meta.env.VITE_E2E === 'true') return Promise.resolve()
  const config: ProviderManagedRequestConfig = { providerManaged: true }
  try {
    await apiClient.delete(`external/safe/${chainId}/cache/${address}`, config)
  } catch {
    // A completed proposal/chain operation must not become a failed write because cache refresh failed.
    // Reads retain their normal error/periodic recovery behaviour.
  }
}

export function readMarket<T>(path: string, signal?: AbortSignal) {
  const config: ProviderManagedRequestConfig = { providerManaged: true, signal }
  return coordinated('market', () => apiClient.get<T>(`external/market/${path}`, config))
}

/** Adapter preserving the historical-rate fetcher's injectable response contract. */
export async function fetchHistoricalMarket(input: string, init?: RequestInit) {
  const url = new URL(input)
  const match = url.pathname.match(/^\/api\/v3\/(coins\/[a-z0-9-]+\/history)$/)
  if (!match) throw new Error('Invalid historical market target')
  const { data } = await readMarket(
    `${match[1]}?date=${encodeURIComponent(url.searchParams.get('date') ?? '')}`,
    init?.signal ?? undefined
  )
  return { ok: true, json: async () => data }
}
