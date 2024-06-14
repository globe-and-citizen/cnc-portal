import { useCustomFetch } from '../useCustomFetch'
import type { User } from '@/types'
import { ref } from 'vue'

export function useUpdateUser() {
  const isUpdating = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (updatedUser: Partial<User>): Promise<Partial<User>> => {
    isUpdating.value = true
    try {
      const { data: updatedUserData, error: err } = await useCustomFetch<User>(
        `user/${updatedUser.address}`
      )
        .put(JSON.stringify(updatedUser))
        .json()
      data.value = updatedUserData
      error.value = err.value
      isSuccess.value = true
      return updatedUserData.value
    } catch (err: any) {
      data.value = null
      error.value = err.value
      throw new Error(err.value)
    } finally {
      isUpdating.value = false
    }
  }
  return {
    userIsUpdating: isUpdating,
    isSuccess,
    data,
    error,
    execute
  }
}
export function useCreateUser() {
  const isCreating = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (user: User): Promise<User> => {
    isCreating.value = true
    try {
      const { data: createdUserData, error: err } = await useCustomFetch<User>(
        `user/${user.address}`
      )
        .post(JSON.stringify(user))
        .json()
      data.value = createdUserData
      error.value = err.value
      isSuccess.value = true
      return createdUserData.value
    } catch (err: any) {
      data.value = null
      error.value = err.value
      throw new Error(err.value)
    } finally {
      isCreating.value = false
    }
  }
  return {
    userIsCreating: isCreating,
    isSuccess,
    data,
    error,
    execute
  }
}
export function useGetUser() {
  const isFetching = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (address: string): Promise<User> => {
    isFetching.value = true
    try {
      const { data: userData, error: err } = await useCustomFetch<User>(`user/${address}`)
        .get()
        .json()
      data.value = userData
      error.value = err.value
      isSuccess.value = true
      return userData.value
    } catch (err: any) {
      data.value = null
      error.value = err.value
      throw new Error(err.value)
    } finally {
      isFetching.value = false
    }
  }
  return {
    userIsFetching: isFetching,
    isSuccess,
    data,
    error,
    execute
  }
}
export function useSearchUser() {
  const isSearching = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (name: string, address: string): Promise<User[]> => {
    isSearching.value = true
    try {
      const params = new URLSearchParams()
      if (!name && !address) return []
      if (name) params.append('name', name)
      if (address) params.append('address', address)
      const { data: users, error: err } = await useCustomFetch<User>(
        `user/search?${params.toString()}`
      )
        .get()
        .json()
      data.value = users
      error.value = err.value
      isSuccess.value = true
      return users.value.users
    } catch (err: any) {
      data.value = null
      error.value = err.value
      throw new Error(err.value)
    } finally {
      isSearching.value = false
    }
  }
  return {
    userIsSearching: isSearching,
    isSuccess,
    data,
    error,
    execute
  }
}
export function useGetAllUsers() {
  const isFetching = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (
    page: string,
    limit: string,
    ownerAddress?: string,
    query?: string
  ): Promise<User[]> => {
    isFetching.value = true
    try {
      const params = new URLSearchParams()
      if (ownerAddress) params.append('ownerAddress', ownerAddress)
      if (query) params.append('query', query)
      params.append('page', page)
      params.append('limit', limit)
      const { data: users, error: err } = await useCustomFetch<User>(
        `user/getAllUsers?${params.toString()}`
      )
        .get()
        .json()
      data.value = users
      error.value = err.value
      isSuccess.value = true
      return users.value.users
    } catch (err: any) {
      data.value = null
      error.value = err.value
      throw new Error(err.value)
    } finally {
      isFetching.value = false
    }
  }
  return {
    userIsFetching: isFetching,
    isSuccess,
    data,
    error,
    execute
  }
}
export function useGetNonce() {
  const isFetching = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)

  const execute = async (userId: string): Promise<string> => {
    isFetching.value = true
    try {
      const { data: nonce, error: err } = await useCustomFetch<string>(`user/nonce/${userId}`)
        .get()
        .json()
      data.value = nonce
      error.value = err.value
      isSuccess.value = true
      return nonce.value.nonce
    } catch (err: any) {
      data.value = null
      error.value = err.value
      throw new Error(err.value)
    } finally {
      isFetching.value = false
    }
  }
  return {
    userIsFetching: isFetching,
    isSuccess,
    data,
    error,
    execute
  }
}
