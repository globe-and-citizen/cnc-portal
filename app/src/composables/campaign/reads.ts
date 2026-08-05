import { computed, unref, type MaybeRef } from 'vue'
import { useChainId } from '@wagmi/vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import type { Address, PublicClient } from 'viem'
import { readContract } from 'viem/actions'
import { formatUnits } from 'viem'
import { config } from '@/wagmi.config'
import { adCampaignManagerAbi } from '@/artifacts/abi/generated'
import {
  fetchCampaignLogs,
  groupCampaignEventsByCode,
  type EventsByCampaignCode
} from '@/lib/campaign/events'

type ConfiguredChainId = (typeof config)['chains'][number]['id']

export type AdvertisingCampaignStatus = 'active' | 'completed'

export interface AdvertisingCampaign {
  id: number
  code: string
  budget: bigint
  amountSpent: bigint
  remainingBudget: bigint
  advertiser: Address
  status: AdvertisingCampaignStatus
}

interface CampaignContractRecord {
  budget: bigint
  amountSpent: bigint
  status: number
  campaignCode: string
  advertiser: Address
}

export interface CampaignManagerSettings {
  costPerClick: string
  costPerImpression: string
  bankAddress: Address
}

export async function fetchCampaignManagerSettings(
  client: PublicClient,
  contractAddress: Address
): Promise<CampaignManagerSettings> {
  const [costPerClick, costPerImpression, bankAddress] = await Promise.all([
    readContract(client, {
      address: contractAddress,
      abi: adCampaignManagerAbi,
      functionName: 'getCostPerClick'
    }),
    readContract(client, {
      address: contractAddress,
      abi: adCampaignManagerAbi,
      functionName: 'getCostPerImpression'
    }),
    readContract(client, {
      address: contractAddress,
      abi: adCampaignManagerAbi,
      functionName: 'getBankContractAddress'
    })
  ])

  return {
    costPerClick: formatUnits(costPerClick, 18),
    costPerImpression: formatUnits(costPerImpression, 18),
    bankAddress
  }
}

export function useCampaignManagerSettings(
  contractAddress: MaybeRef<Address | undefined>,
  options?: { enabled?: MaybeRef<boolean> }
) {
  const chainId = useChainId()
  const address = computed(() => unref(contractAddress))
  const enabled = computed(() => !!address.value && (unref(options?.enabled) ?? true))

  return useQuery<CampaignManagerSettings>({
    queryKey: ['campaign', 'manager-settings', address, chainId],
    enabled,
    queryFn: () => {
      const client = getPublicClient(config, {
        chainId: chainId.value as ConfiguredChainId
      }) as PublicClient
      return fetchCampaignManagerSettings(client, address.value!)
    }
  })
}

export async function fetchAdvertisingCampaigns(
  client: PublicClient,
  contractAddress: Address
): Promise<AdvertisingCampaign[]> {
  const count = await readContract(client, {
    address: contractAddress,
    abi: adCampaignManagerAbi,
    functionName: 'getAdCampaignCount'
  })

  const campaignCount = Number(count)
  if (!campaignCount) return []

  const campaigns = await Promise.all(
    Array.from({ length: campaignCount }, (_, index) =>
      readContract(client, {
        address: contractAddress,
        abi: adCampaignManagerAbi,
        functionName: 'getAdCampaigns',
        args: [BigInt(index + 1)]
      })
    )
  )

  return campaigns.map((campaign, index) => {
    const record = campaign as CampaignContractRecord
    return {
      id: index + 1,
      code: record.campaignCode,
      budget: record.budget,
      amountSpent: record.amountSpent,
      remainingBudget: record.budget > record.amountSpent ? record.budget - record.amountSpent : 0n,
      advertiser: record.advertiser,
      status: record.status === 0 ? 'active' : 'completed'
    }
  })
}

export function useAdvertisingCampaigns(
  contractAddress: MaybeRef<Address | undefined>,
  options?: { enabled?: MaybeRef<boolean> }
) {
  const chainId = useChainId()
  const address = computed(() => unref(contractAddress))
  const enabled = computed(() => !!address.value && (unref(options?.enabled) ?? true))

  return useQuery<AdvertisingCampaign[]>({
    queryKey: ['campaign', 'list', address, chainId],
    enabled,
    queryFn: () => {
      const client = getPublicClient(config, {
        chainId: chainId.value as ConfiguredChainId
      }) as PublicClient
      return fetchAdvertisingCampaigns(client, address.value!)
    }
  })
}

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
      const client = getPublicClient(config, {
        chainId: chainId.value as ConfiguredChainId
      }) as PublicClient
      const logs = await fetchCampaignLogs(client, address.value!)
      return groupCampaignEventsByCode(logs)
    }
  })
}
