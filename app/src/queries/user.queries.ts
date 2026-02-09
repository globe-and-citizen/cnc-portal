import type { User } from '@/types/user'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { Address } from 'viem'
import { createQueryHook, createMutationHook, queryPresets } from './queryFactory'

/**
 * Query key factory for user-related queries
 */
export const userKeys = {
  all: ['users'] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (address: Address | undefined) => [...userKeys.details(), { address }] as const,
  nonces: () => [...userKeys.all, 'nonce'] as const,
  nonce: (address: Address | undefined) => [...userKeys.nonces(), { address }] as const
}

// ============================================================================
// PUT /user/{address} - Update user
// ============================================================================

/**
 * Request body for updating a user
 */
export interface UpdateUserBody extends Partial<User> {
  /** Optional team ID for user-team association */
  teamId?: string
}

/**
 * Combined parameters for useUpdateUserMutation
 */
export interface UpdateUserParams {
  pathParams: {
    /** User wallet address */
    address: string
  }
  body: UpdateUserBody
}

/**
 * Update an existing user
 *
 * @endpoint PUT /user/{address}
 * @pathParams { address: string }
 * @queryParams none
 * @body UpdateUserBody - user data to update
 */
export const useUpdateUserMutation = createMutationHook<User, UpdateUserParams>({
  method: 'PUT',
  endpoint: 'user/{address}',
  invalidateKeys: (params) => [userKeys.detail(params.pathParams.address as Address)]
})

// ============================================================================
// GET /user/{userAddress} - Fetch user data
// ============================================================================

/**
 * Combined parameters for useGetUserQuery
 */
export interface GetUserParams {
  pathParams: {
    /** User wallet address */
    address: MaybeRefOrGetter<Address | undefined>
  }
}

/**
 * Fetch user data by address
 *
 * @endpoint GET /user/{userAddress}
 * @pathParams { address: string }
 * @queryParams none
 * @body none
 */
export const useGetUserQuery = createQueryHook<Partial<User>, GetUserParams>({
  endpoint: (params) => `user/${toValue(params.pathParams.address)}`,
  queryKey: (params) => userKeys.detail(toValue(params.pathParams.address)),
  enabled: (params) => !!toValue(params.pathParams.address),
  options: {
    ...queryPresets.stable,
    refetchOnWindowFocus: false
  }
})

// ============================================================================
// GET /user/nonce/{userAddress} - Fetch user nonce
// ============================================================================

/**
 * Combined parameters for useGetUserNonceQuery
 */
export interface GetUserNonceParams {
  pathParams: {
    /** User wallet address */
    address: MaybeRefOrGetter<Address | undefined>
  }
}

/**
 * Fetch user nonce by address (for SIWE)
 *
 * @endpoint GET /user/nonce/{userAddress}
 * @pathParams { address: string }
 * @queryParams none
 * @body none
 */
export const useGetUserNonceQuery = createQueryHook<Partial<User>, GetUserNonceParams>({
  endpoint: (params) => `user/nonce/${toValue(params.pathParams.address)}`,
  queryKey: (params) => userKeys.nonce(toValue(params.pathParams.address)),
  enabled: (params) => !!toValue(params.pathParams.address),
  options: {
    ...queryPresets.stable,
    refetchOnWindowFocus: false,
    // Nonce should not be cached
    gcTime: 0
  }
})

// ============================================================================
// GET /user?search=...&limit=... - Search users
// ============================================================================

/**
 * Response type for user search query
 */
export interface SearchUsersResponse {
  users: User[]
}

/**
 * Combined parameters for useGetSearchUsersQuery
 */
export interface GetSearchUsersParams {
  queryParams: {
    /** Search term */
    search?: MaybeRefOrGetter<string | undefined>
    /** Maximum number of results */
    limit?: MaybeRefOrGetter<number>
  }
}

/**
 * Search users by name or address
 *
 * @endpoint GET /user?search=...&limit=...
 * @pathParams none
 * @queryParams { search?: string, limit?: number }
 * @body none
 */
export const useGetSearchUsersQuery = createQueryHook<SearchUsersResponse, GetSearchUsersParams>({
  endpoint: 'user',
  queryKey: (params) => [
    ...userKeys.all,
    'search',
    { search: toValue(params.queryParams.search), limit: toValue(params.queryParams.limit) ?? 100 }
  ],
  options: {
    ...queryPresets.stable,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 300000, // 5 minutes - longer cache time for search results
    gcTime: 600000
  }
})
