import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { User } from '@/types/user'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { Address } from 'viem'
import type { AxiosError } from 'axios'

/**
 * Update an existing user
 */
export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<
    User,
    AxiosError,
    { address: string; userData: Partial<User & { teamId?: string }> }
  >({
    mutationFn: async ({
      address,
      userData
    }: {
      address: string
      userData: Partial<User & { teamId?: string }>
    }) => {
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

/**
 * Response type for user search query
 */
export interface SearchUsersResponse {
  users: User[]
}

/**
 * Search users by name or address
 *
 * @endpoint GET /user?search=...&limit=...
 * @params none
 * @queryParams { search?: string, limit?: number }
 * @body none
 */
export const useSearchUsersQuery = (
  search: MaybeRefOrGetter<string | undefined>,
  limit: MaybeRefOrGetter<number> = 100
) => {
  return useQuery<SearchUsersResponse, AxiosError>({
    queryKey: ['users', 'search', { search, limit }],
    queryFn: async () => {
      const searchValue = toValue(search)
      const limitValue = toValue(limit)

      const queryParams: Record<string, string | number> = { limit: limitValue }
      if (searchValue) {
        queryParams.search = searchValue
      }

      const { data } = await apiClient.get<SearchUsersResponse>('user', { params: queryParams })
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 300000, // 5 minutes - longer cache time for search results
    gcTime: 600000
  })
}
