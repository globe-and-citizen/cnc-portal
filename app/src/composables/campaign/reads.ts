import { computed, unref, type MaybeRef } from 'vue'
import { useChainId } from '@wagmi/vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import type { Address, PublicClient } from 'viem'
import { config } from '@/wagmi.config'
import {
  fetchCampaignLogs,
  groupCampaignEventsByCode,
  type EventsByCampaignCode
} from '@/lib/campaign/events'

export function useCampaignEventsByCode(
  contractAddress: MaybeRef<Address | undefined>,
  options?: { enabled?: MaybeRef<boolean> }
) {
  const chainId = useChainId()
  const address = computed(() => unref(contractAddress))
  const enabled = computed(() => !!address.value && (unref(options?.enabled) ?? true))

  return useQuery<EventsByCampaignCode>({
    queryKey: ['campaign', 'events', address, chainId],
    enabled,
    queryFn: async () => {
      const client = getPublicClient(config, { chainId: chainId.value }) as PublicClient
      const logs = await fetchCampaignLogs(client, address.value!)
      return groupCampaignEventsByCode(logs)
    }
  })
}
