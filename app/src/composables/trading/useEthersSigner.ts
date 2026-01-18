import { computed, markRaw } from 'vue'
import { useConnectorClient } from '@wagmi/vue'
import { clientToSigner } from '@/utils'

export function useEthersSigner() {
  const { data: client } = useConnectorClient()

  const ethersSigner = computed(() => {
    if (!client.value) return null
    // markRaw prevents Vue from trying to convert the
    // complex Ethers class into a proxy
    return markRaw(clientToSigner(client.value))
  })

  return { ethersSigner }
}
