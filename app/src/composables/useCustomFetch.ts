import { BACKEND_URL } from '@/constant/index'
import { createFetch, useStorage } from '@vueuse/core'
import { log } from '@/utils/generalUtil'
import { useToastStore } from '@/stores/useToastStore'
const isRedirecting = ref(false)

import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

export const useCustomFetch = createFetch({
  baseUrl: `${BACKEND_URL}/api/`,
  combination: 'chain',
  options: {
    async beforeFetch({ options }: { options: RequestInit & { url?: string } }) {
      const token = useStorage('authToken', '')
      // remove authorization header for nonce endpoint
      const isNonceEndpoint = options.url?.includes('user/nonce/')

      options = {
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...(isNonceEndpoint ? {} : { Authorization: `Bearer ${token.value}` })
        }
      }
      return { options }
    },
    async onFetchError(ctx) {
      if (ctx.response?.status === 401 && !isRedirecting.value) {
        isRedirecting.value = true
        const { addErrorToast } = useToastStore()
        addErrorToast('You are Unauthorized')
        log.info('Unauthorized, will check the token')

        const { logout, validateToken } = useAuth()
        if (!(await validateToken())) {
          log.info('Token is not valid, will logout the user')
          logout()
        } else {
          log.warn('There is an **401 Error** but the Token is valid, try ')
          isRedirecting.value = false
        }
      }
      return ctx
    }
  }
})
