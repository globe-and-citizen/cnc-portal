import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { isAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { electionsAbi } from '@/artifacts/abi/generated'
import type { Election } from '@/types'
import { log } from '@/lib/logging'
import { toElection } from '@/utils/elections/election'
import { useElectionsAddress } from './reads'

/**
 * Every published election the team has ever run, newest first. The contract
 * lists all its ids in one call; the details are read together and the
 * configured transport batches them, so the archive stays one round trip
 * rather than growing with the team's history.
 */
async function fetchPastElections(electionsAddress: Address): Promise<Election[]> {
  const ids = await readContract(config, {
    address: electionsAddress,
    abi: electionsAbi,
    functionName: 'getElectionIds'
  })

  const reads = await Promise.allSettled(
    ids.map((id) =>
      readContract(config, {
        address: electionsAddress,
        abi: electionsAbi,
        functionName: 'getElection',
        args: [id]
      })
    )
  )

  const published = reads.flatMap((read) => {
    if (read.status === 'rejected') {
      log.error('Error fetching past election:', read.reason)
      return []
    }
    const election = toElection(read.value)
    return election?.resultsPublished ? [election] : []
  })

  return published.sort((a, b) => b.id - a.id)
}

/**
 * The published elections, newest first.
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
