import { useUser } from '~/queries/index'

export const useUserStore = defineStore('user', () => {
  const authStore = useAuthStore()

  const { data: user } = useUser(authStore.address.value || '')
  return { user }
})
