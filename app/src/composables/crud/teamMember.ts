import { useCustomFetch } from '../useCustomFetch'
import type { Member } from '@/types'
import { ref } from 'vue'
export function useDeleteMember() {
  const isFetching = ref(false)
  const data = ref<any>()
  const error = ref<any>()
  const isSuccess = ref(false)
  const execute = async (id: string, address: string) => {
    isFetching.value = true
    try {
      const { data: deletedMember, error: err } = await useCustomFetch<Member>(
        `teams/${id}/member`,
        {
          headers: {
            memberaddress: address
          }
        }
      )
        .delete()
        .json()
      data.value = deletedMember
      error.value = err.value
      isSuccess.value = true
    } catch (err: any) {
      data.value = null
      error.value = err.value
    } finally {
      isFetching.value = false
    }
  }
  return {
    memberIsDeleting: isFetching,
    data,
    isSuccess,
    error,
    execute
  }
}
