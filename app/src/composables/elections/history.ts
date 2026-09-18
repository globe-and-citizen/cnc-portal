import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { isAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { electionsAbi } from '@/artifacts/abi/generated'
import type { Election } from '@/types'
import { log } from '@/lib/logging'
import { toElection, type RawElection } from '@/utils/elections/election'
import { useElectionsAddress } from './reads'

/** How far back the list looks, and how many published elections it keeps. */
const PAST_ELECTIONS_LOOKBACK = 5
const PAST_ELECTIONS_SHOWN = 3

async function fetchPastElections(electionsAddress: Address): Promise<Election[]> {
  const nextElectionId = await readContract(config, {
    address: electionsAddress,
    abi: electionsAbi,
    functionName: 'getNextElectionId'
  })

  const latestElectionId = Number(nextElectionId) - 1
  if (latestElectionId < 1) return []

  const published: Election[] = []
  const oldestChecked = Math.max(1, latestElectionId - PAST_ELECTIONS_LOOKBACK + 1)

  for (let id = latestElectionId; id >= oldestChecked; id--) {
    if (published.length >= PAST_ELECTIONS_SHOWN) break

    try {
      const raw = (await readContract(config, {
        address: electionsAddress,
        abi: electionsAbi,
        functionName: 'getElection',
        args: [BigInt(id)]
      })) as RawElection

      const election = toElection(raw)
      if (election?.resultsPublished) published.push(election)
    } catch (error) {
      log.error('Error fetching past election:', error)
    }
  }

  return published
}

/**
 * The most recent published elections, newest first.
 *
 * Every page listing past elections reads them here: publishing a result
 * invalidates the `pastElections` key from the write layer, which is what keeps
 * the list current without anyone refreshing it by hand.
 */
export function useElectionsPastElections() {
  const address = useElectionsAddress()
  const isAddressReady = computed(() => !!address.value && isAddress(address.value))

  return useQuery({
    queryKey: ['pastElections', address],
    enabled: isAddressReady,
    queryFn: async () => (address.value ? fetchPastElections(address.value) : [])
  })
}
