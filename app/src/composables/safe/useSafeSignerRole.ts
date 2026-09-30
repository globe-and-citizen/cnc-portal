import { computed, type Ref } from 'vue'
import { useUserDataStore } from '@/stores'
import type { SafeInfo } from '@/types/safe'

/** Whether the connected wallet is one of the Safe's signers. */
export function useSafeSignerRole(safeInfo: Ref<SafeInfo | undefined>) {
  const userDataStore = useUserDataStore()

  const isConnectedUserOwner = computed(() => {
    const address = userDataStore.address?.toLowerCase()
    if (!address || !safeInfo.value?.owners?.length) return false
    return safeInfo.value.owners.some((owner) => owner.toLowerCase() === address)
  })

  return { isConnectedUserOwner }
}
