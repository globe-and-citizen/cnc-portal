import { useUserQuery } from '~/queries/index'

export const useUserStore = defineStore('user', () => {
  const authStore = useAuthStore()

  const { data: user } = useUserQuery(authStore.address.value || '')
  return { user }
})
