import { useCustomFetch } from '../useCustomFetch'
import type { Member } from '@/types'
export function useDeleteMember(id: string, address: string) {
  const {
    isFetching: memberIsDeleting,
    data,
    error
  } = useCustomFetch<Member>(`teams/${id}/member`, {
    headers: {
      memberaddress: address
    }
  })
    .delete()
    .json()

  return {
    memberIsDeleting,
    data,
    error
  }
}
