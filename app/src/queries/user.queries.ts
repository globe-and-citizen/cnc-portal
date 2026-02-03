import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { User } from '@/types/user'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { Address } from 'viem'
import type { AxiosError } from 'axios'

/**
 * Mutation input for useUpdateUserMutation
 */
export interface UpdateUserInput {
  /** URL path parameter: user address */
  address: string
  /** Request body: user data to update */
  userData: Partial<User & { teamId?: string }>
}

/**
 * Update an existing user
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
      queryClient.invalidateQueries({ queryKey: ['user', { address: String(variables.address) }] })
      // queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })
}

/**
 * Fetch user data by address
 *
 * @endpoint GET /user/{userAddress}
 * @params { userAddress: Address } - URL path parameter
 * @queryParams none
 * @body none
 */
export const useUserQuery = (address: MaybeRefOrGetter<Address | undefined>) => {
  return useQuery({
    queryKey: ['user', { address }],
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
 * @params { userAddress: Address } - URL path parameter
 * @queryParams none
 * @body none
 */
export const useUserNonceQuery = (address: MaybeRefOrGetter<Address | undefined>) => {
  return useQuery({
    queryKey: ['user', 'nonce', { address }],
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
