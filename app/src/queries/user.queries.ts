import { useQuery } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { User } from '@/types/user'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { Address } from 'viem'

/**
 * Fetch user data by address
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
