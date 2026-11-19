import { type Ref, computed } from 'vue'
import type { SafeInfo } from '@/types/safe'
import { useUserDataStore } from '@/stores'

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
