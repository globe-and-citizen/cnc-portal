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

/**
 * Path parameters for user endpoints
 */
export interface UserPathParams {
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
 * Mutation input for useUpdateUserMutation
 */
export interface UpdateUserInput {
  /** URL path parameter: user address */
  address: string
  /** Request body: user data to update */
  userData: UpdateUserBody
}

/**
 * Update an existing user
 *
 * @endpoint PUT /user/{address}
 * @params UserPathParams - URL path parameter
 * @body UpdateUserBody - user data to update
 */
export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<User, AxiosError, UpdateUserInput>({
    mutationFn: async ({ address, userData }: UpdateUserInput) => {
      const { data } = await apiClient.put<User>(`user/${address}`, userData)
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate specific user and users list
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.address as Address) })
      // queryClient.invalidateQueries({ queryKey: userKeys.all })
    }
  })
}

/**
 * Fetch user data by address
 *
 * @endpoint GET /user/{userAddress}
 * @params UserPathParams - URL path parameter
 * @queryParams none
 * @body none
 */
export const useGetUserQuery = (address: MaybeRefOrGetter<Address | undefined>) => {
  return useQuery({
    queryKey: userKeys.detail(toValue(address)),
    queryFn: async () => {
      const userAddress = toValue(address)
      const { data } = await apiClient.get<Partial<User>>(`user/${userAddress}`)
      return data
    },
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false
  })
}

/**
 * Fetch user nonce by address (for SIWE)
 *
 * @endpoint GET /user/nonce/{userAddress}
 * @params UserPathParams - URL path parameter
 * @queryParams none
 * @body none
 */
export const useGetUserNonceQuery = (address: MaybeRefOrGetter<Address | undefined>) => {
  return useQuery({
    queryKey: userKeys.nonce(toValue(address)),
    queryFn: async () => {
      const userAddress = toValue(address)
      const { data } = await apiClient.get<Partial<User>>(`user/nonce/${userAddress}`)
      return data
    },
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false,
    // Nonce should not be cached
    gcTime: 0
  })
}

/**
 * @deprecated Use useGetUserQuery instead
 */
export const useUserQuery = useGetUserQuery

/**
 * @deprecated Use useGetUserNonceQuery instead
 */
export const useUserNonceQuery = useGetUserNonceQuery
