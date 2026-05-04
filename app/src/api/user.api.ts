import apiClient from '@/lib/axios'
import type { User } from '@/types'
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

/**
 * Imperative fetch of the authenticated user profile by address.
 *
 * Used inside `useSiweMutation` after the JWT is in storage; component
 * consumers should prefer `useGetUserQuery` for reactive reads.
 */
export const getUser = async (address: Address): Promise<Partial<User>> => {
  const { data } = await apiClient.get<Partial<User>>(`user/${address}`)
  return data
}
