import type { UpdateUserPayload } from '@/types/user'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { getUserByAddress, getUserNonce, getUsers, updateUser } from '~/api/user'

/**
 * Fetch user data by address
 *
 * @param address - The Ethereum address of the user
 * @returns Query result with user data
 *
 * @example
 * const { data: user, isLoading } = useUserQuery('0x123...')
 */
export const useUserQuery = (address: MaybeRefOrGetter<string>) => {
  return useQuery({
    queryKey: ['user', { address: toValue(address) }],
    queryFn: async () => {
      const userAddress = toValue(address)
      return await getUserByAddress(userAddress)
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
      return await getUserNonce(userAddress)
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

      return await getUsers({
        page,
        limit,
        search
      })
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
      return await updateUser(address, payload)
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
