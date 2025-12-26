import { BACKEND_URL } from '@/constant/index'
import { createFetch, useStorage } from '@vueuse/core'
import { log } from '@/utils/generalUtil'
import { useToastStore } from '@/stores/useToastStore'
const isRedirecting = ref(false)

import { ref } from 'vue'
// import { useAuth } from '@/composables/useAuth'

/**
 * @deprecated use apiClient from '@/lib/axios' + Queries/Mutations instead
 */
export const useCustomFetch = createFetch({
  baseUrl: `${BACKEND_URL}/api/`,
  combination: 'chain',
  options: {
    async beforeFetch({ options }) {
      const token = useStorage('authToken', '')
      // TODO : Validate token and log the status of the token we get from the storage.
      options = {
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`
        }
      }
      return { options }
    },
    async onFetchError(ctx) {
      if (ctx.response?.status === 401 && !isRedirecting.value) {
        isRedirecting.value = true
        const { addErrorToast } = useToastStore()
        addErrorToast('Your are Unauthorized')
        log.info('Unauthorized, will check the token')

        // TODO : Instead of logging out the user, we can recheck if the token is expired and refresh it.
        // const { logout, validateToken } = useAuth()
        // if (!(await validateToken())) {
        //   log.info('Token is not valid, will logout the user')
        //   logout()
        // } else {
        //   log.warn('There is an **401 Error** but the Token is valid, try ')
        // }
      }
      return ctx
    }
  }
})
