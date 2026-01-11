import type { Address } from 'viem'
import type { ApiUser, UsersResponse, UpdateUserPayload, NonceResponse } from '~/types/user'
import { apiFetch } from '~/lib/fetch'

/**
 * Fetch all users with pagination and search support
 */
export const getUsers = (params: {
  page?: number
  limit?: number
  search?: string
}) => {
  const queryParams = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 10)
  })

  if (params.search) {
    queryParams.append('search', params.search)
  }

  return apiFetch<UsersResponse>(`/user?${queryParams.toString()}`)
}

/**
 * Fetch user by Ethereum address
 */
export const getUserByAddress = (address: Address) => {
  return apiFetch<ApiUser>(`/user/${address}`)
}

/**
 * Fetch user nonce for SIWE authentication
 */
export const getUserNonce = (address: Address) => {
  return apiFetch<NonceResponse>(`/user/nonce/${address}`)
}

/**
 * Update user profile information
 */
export const updateUser = (address: Address, payload: UpdateUserPayload) => {
  return apiFetch<ApiUser>(`/user/${address}`, {
    method: 'PUT',
    body: payload
  })
}
