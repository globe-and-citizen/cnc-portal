import { ref, watch } from 'vue'
import { config } from '@/wagmi.config'
import { getPublicClient } from '@wagmi/core'
import { useBlockNumber } from '@wagmi/vue'

/**
 * Returns the latest block's timestamp as a reactive bigint (unix seconds),
 * updated on every new block. Matches what the contract sees via block.timestamp.
 */
export function useBlockTimestamp() {
  const blockTimestamp = ref<bigint | null>(null)
  const { data: blockNumber } = useBlockNumber({ watch: true })

  watch(
    blockNumber,
    async (num) => {
      if (num === undefined) return
      const client = getPublicClient(config)
      if (!client) return
      const block = await client.getBlock({ blockNumber: num })
      blockTimestamp.value = block.timestamp
    },
    { immediate: true }
  )

  return blockTimestamp
}
