import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
// import { apiClient } from '@/api'
import type { ApiUser, UsersResponse, UpdateUserPayload, NonceResponse } from '@/types/user'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { apiClient } from '~/lib/index'

/**
 * Fetch user data by address
 *
 * @param address - The Ethereum address of the user
 * @returns Query result with user data
 *
 * @example
 * const { data: user, isLoading } = useUser('0x123...')
 */
export const useUser = (address: MaybeRefOrGetter<string>) => {
  return useQuery({
    queryKey: ['user', { address: toValue(address) }],
    queryFn: async () => {
      const userAddress = toValue(address)
      const { data } = await apiClient.get<ApiUser>(`user/${userAddress}`)
      return data
    },
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

/**
 * Fetch user nonce by address (for SIWE authentication)
 *
 * @param address - The Ethereum address of the user
 * @returns Query result with nonce
 *
 * @example
 * const { data: nonceData } = useUserNonce('0x123...')
 * const nonce = nonceData.value?.nonce
 */
export const useUserNonce = (address: MaybeRefOrGetter<string>) => {
  return useQuery({
    queryKey: ['user', 'nonce', { address: toValue(address) }],
    queryFn: async () => {
      const userAddress = toValue(address)
      const { data } = await apiClient.get<NonceResponse>(`user/nonce/${userAddress}`)
      return data
    },
    enabled: () => !!toValue(address),
    refetchOnWindowFocus: false,
    // Nonce should not be cached
    gcTime: 0,
    staleTime: 0
  })
}

/**
 * Fetch all users with pagination and search support
 *
 * @param options - Query options (page, limit, search)
 * @returns Query result with paginated users list
 *
 * @example
 * const { data: response, isLoading } = useUsers({
 *   page: 1,
 *   limit: 10,
 *   search: 'john'
 * })
 */
export const useUsers = (options: {
  page?: MaybeRefOrGetter<number>
  limit?: MaybeRefOrGetter<number>
  search?: MaybeRefOrGetter<string | undefined>
}) => {
  return useQuery({
    queryKey: [
      'users',
      {
        page: toValue(options.page) || 1,
        limit: toValue(options.limit) || 10,
        search: toValue(options.search) || ''
      }
    ],
    queryFn: async () => {
      const page = toValue(options.page) || 1
      const limit = toValue(options.limit) || 10
      const search = toValue(options.search)

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit)
      })

      if (search) {
        params.append('search', search)
      }

      const { data } = await apiClient.get<UsersResponse>(`user?${params.toString()}`)
      return data
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

/**
 * Update user profile information
 *
 * @returns Mutation for updating user profile
 *
 * @example
 * const { mutate: updateUser, isPending } = useUpdateUser()
 * updateUser({
 *   address: '0x123...',
 *   payload: { name: 'John Doe', imageUrl: 'https://...' }
 * })
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      address,
      payload
    }: {
      address: string
      payload: UpdateUserPayload
    }) => {
      const { data } = await apiClient.put<ApiUser>(`user/${address}`, payload)
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate user query
      queryClient.invalidateQueries({
        queryKey: ['user', { address: variables.address }]
      })
      // Invalidate users list query
      queryClient.invalidateQueries({
        queryKey: ['users']
      })
      // Update specific user in cache if it exists
      queryClient.setQueryData(['user', { address: variables.address }], data)
    },
    onError: (error) => {
      console.error('Failed to update user profile:', error)
    }
  })
}

/**
 * Refetch user data
 *
 * @param address - The user's address
 * @returns Function to manually refetch user data
 *
 * @example
 * const { refetchUser } = useRefetchUser('0x123...')
 * await refetchUser()
 */
export const useRefetchUser = (address: MaybeRefOrGetter<string>) => {
  const queryClient = useQueryClient()

  const refetchUser = async () => {
    return queryClient.invalidateQueries({
      queryKey: ['user', { address: toValue(address) }]
    })
  }

  return { refetchUser }
}

/**
 * Get cached user data without triggering a query
 *
 * @param address - The user's address
 * @returns Cached user data if available
 *
 * @example
 * const { getCachedUser } = useGetCachedUser('0x123...')
 * const user = getCachedUser()
 */
export const useGetCachedUser = (address: MaybeRefOrGetter<string>) => {
  const queryClient = useQueryClient()

  const getCachedUser = () => {
    return queryClient.getQueryData<User>(['user', { address: toValue(address) }])
  }

  return { getCachedUser }
}
