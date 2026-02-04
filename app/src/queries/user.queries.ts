import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { User } from '@/types/user'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { Address } from 'viem'
import type { AxiosError } from 'axios'

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
 * Path parameters for PUT /user/{address}
 */
export interface UpdateUserPathParams {
  /** User wallet address */
  address: string
}

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
  pathParams: UpdateUserPathParams
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
export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<User, AxiosError, UpdateUserParams>({
    mutationFn: async (params: UpdateUserParams) => {
      const { pathParams, body } = params
      const { data } = await apiClient.put<User>(`user/${pathParams.address}`, body)
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate specific user and users list
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.pathParams.address as Address) })
    }
  })
}

// ============================================================================
// GET /user/{userAddress} - Fetch user data
// ============================================================================

/**
 * Path parameters for GET /user/{userAddress}
 */
export interface GetUserPathParams {
  /** User wallet address */
  address: MaybeRefOrGetter<Address | undefined>
}

/**
 * Query parameters for GET /user/{userAddress} (none for this endpoint)
 */
export interface GetUserQueryParams {}

/**
 * Combined parameters for useGetUserQuery
 */
export interface GetUserParams {
  pathParams: GetUserPathParams
  queryParams?: GetUserQueryParams
}

/**
 * Fetch user data by address
 *
 * @endpoint GET /user/{userAddress}
 * @pathParams { address: string }
 * @queryParams none
 * @body none
 */
export const useGetUserQuery = (params: GetUserParams) => {
  const { pathParams } = params

  return useQuery({
    queryKey: userKeys.detail(toValue(pathParams.address)),
    queryFn: async () => {
      const userAddress = toValue(pathParams.address)
      const { data } = await apiClient.get<Partial<User>>(`user/${userAddress}`)
      return data
    },
    enabled: () => !!toValue(pathParams.address),
    refetchOnWindowFocus: false
  })
}

// ============================================================================
// GET /user/nonce/{userAddress} - Fetch user nonce
// ============================================================================

/**
 * Path parameters for GET /user/nonce/{userAddress}
 */
export interface GetUserNoncePathParams {
  /** User wallet address */
  address: MaybeRefOrGetter<Address | undefined>
}

/**
 * Query parameters for GET /user/nonce/{userAddress} (none for this endpoint)
 */
export interface GetUserNonceQueryParams {}

/**
 * Combined parameters for useGetUserNonceQuery
 */
export interface GetUserNonceParams {
  pathParams: GetUserNoncePathParams
  queryParams?: GetUserNonceQueryParams
}

/**
 * Fetch user nonce by address (for SIWE)
 *
 * @endpoint GET /user/nonce/{userAddress}
 * @pathParams { address: string }
 * @queryParams none
 * @body none
 */
export const useGetUserNonceQuery = (params: GetUserNonceParams) => {
  const { pathParams } = params

  return useQuery({
    queryKey: userKeys.nonce(toValue(pathParams.address)),
    queryFn: async () => {
      const userAddress = toValue(pathParams.address)
      const { data } = await apiClient.get<Partial<User>>(`user/nonce/${userAddress}`)
      return data
    },
    enabled: () => !!toValue(pathParams.address),
    refetchOnWindowFocus: false,
    // Nonce should not be cached
    gcTime: 0
  })
}

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
 * Path parameters for GET /user (none for this endpoint)
 */
export interface GetSearchUsersPathParams {}

/**
 * Query parameters for GET /user
 */
export interface GetSearchUsersQueryParams {
  /** Search term */
  search?: MaybeRefOrGetter<string | undefined>
  /** Maximum number of results */
  limit?: MaybeRefOrGetter<number>
}

/**
 * Combined parameters for useGetSearchUsersQuery
 */
export interface GetSearchUsersParams {
  pathParams?: GetSearchUsersPathParams
  queryParams: GetSearchUsersQueryParams
}

/**
 * Search users by name or address
 *
 * @endpoint GET /user?search=...&limit=...
 * @pathParams none
 * @queryParams { search?: string, limit?: number }
 * @body none
 */
export const useGetSearchUsersQuery = (params: GetSearchUsersParams) => {
  const { queryParams } = params
  const search = queryParams.search
  const limit = queryParams.limit ?? 100

  return useQuery<SearchUsersResponse, AxiosError>({
    queryKey: [...userKeys.all, 'search', { search: toValue(search), limit: toValue(limit) }],
    queryFn: async () => {
      const searchValue = toValue(search)
      const limitValue = toValue(limit)

      const apiQueryParams: { search?: string; limit?: number } = { limit: limitValue }
      if (searchValue) {
        apiQueryParams.search = searchValue
      }

      const { data } = await apiClient.get<SearchUsersResponse>('user', { params: apiQueryParams })
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 300000, // 5 minutes - longer cache time for search results
    gcTime: 600000
  })
}
