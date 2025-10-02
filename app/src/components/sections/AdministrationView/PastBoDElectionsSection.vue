<template>
  <!-- <h2 class="text-xl">Past Elections</h2> -->
  <CardComponent title="Past Election">
    <div v-if="isLoading" class="flex w-full h-96 justify-center items-center">
      <div class="text-gray-500">Loading past elections...</div>
    </div>
    <!-- <div v-else-if="elections.length === 0" class="flex w-full h-96 justify-center items-center">
      <div class="text-gray-500">No past elections available</div>
    </div> -->
    <PastBoDElection404 v-else-if="pastElections?.length === 0" :is-loading="isLoading" />
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      <PastBoDElectionCard
        v-for="(election, index) in pastElections"
        :key="index"
        :election="election"
      />
    </div>
  </CardComponent>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import PastBoDElectionCard from './PastBoDElectionCard.vue'
import PastBoDElection404 from './PastBoDElection404.vue'
import CardComponent from '@/components/CardComponent.vue'
import { useTeamStore } from '@/stores'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { config } from '@/wagmi.config'
import { readContract } from '@wagmi/core'
import type { Election } from '@/types'
import { log, parseError } from '@/utils'
import { useQuery } from '@tanstack/vue-query'

const teamStore = useTeamStore()

// Get the Elections contract address from the team store
const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))
const fetchElections = async (): Promise<Election[]> => {
  if (!electionsAddress.value) return []

  try {
    // Get the next election ID (1 call)
    const nextElectionId = (await readContract(config, {
      address: electionsAddress.value,
      abi: ELECTIONS_ABI,
      functionName: 'getNextElectionId'
    })) as bigint

    const latestElectionId = Number(nextElectionId) - 1
    if (latestElectionId < 1) return []

    const electionsList: Election[] = []

    // Fetch elections sequentially until we have 3 published ones
    // This is more efficient if older elections might not be published
    for (let i = 0; i < Math.min(5, latestElectionId); i++) {
      // Check max 5 elections
      if (electionsList.length >= 3) break

      const electionId = latestElectionId - i
      try {
        const election = (await readContract(config, {
          address: electionsAddress.value,
          abi: ELECTIONS_ABI,
          functionName: 'getElection',
          args: [BigInt(electionId)]
        })) as readonly [bigint, string, string, `0x${string}`, bigint, bigint, bigint, boolean]

        if (election[7]) {
          // resultsPublished
          electionsList.push({
            id: Number(election[0]),
            title: election[1],
            description: election[2],
            createdBy: election[3],
            startDate: new Date(Number(election[4]) * 1000),
            endDate: new Date(Number(election[5]) * 1000),
            seatCount: Number(election[6]),
            resultsPublished: election[7]
          })
        }
      } catch {
        // Skip errors for individual elections
      }
    }

    return electionsList.sort((a, b) => b.id - a.id)
  } catch (err) {
    log.error('Error fetching elections: ', parseError(err))
    return []
  }
}

const {
  data: pastElections,
  isLoading
  //refetch,
  //error
} = useQuery({
  queryKey: ['pastElections', electionsAddress],
  queryFn: fetchElections,
  enabled: computed(() => !!electionsAddress.value)
})
</script>
