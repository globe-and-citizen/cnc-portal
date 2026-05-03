import apiClient from '@/lib/axios'
import type { Address } from 'viem'

export interface UserNonceResponse {
  nonce: string
}

/**
 * Imperative fetch of the SIWE nonce for an address.
 *
 * The SIWE flow is sequential by nature (nonce → sign → submit), so we use
 * an imperative axios call rather than a reactive query — retries on cold
 * starts are handled by the global axios interceptor in `@/lib/axios`.
 */
export const getUserNonce = async (address: Address): Promise<UserNonceResponse> => {
  const { data } = await apiClient.get<UserNonceResponse>(`user/nonce/${address}`)
  return data
}
