<template>
  <!-- <h2 class="text-xl">Past Elections</h2> -->
  <CardComponent title="Past Election">
    <div v-if="isLoading" class="flex w-full h-96 justify-center items-center">
      <div class="text-gray-500">Loading past elections...</div>
    </div>
    <!-- <div v-else-if="elections.length === 0" class="flex w-full h-96 justify-center items-center">
      <div class="text-gray-500">No past elections available</div>
    </div> -->
    <PastBoDElection404 v-else-if="elections.length === 0" :is-loading="isLoading" />
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      <PastBoDElectionCard
        v-for="(election, index) in elections"
        :key="index"
        :election="election"
      />
    </div>
  </CardComponent>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

// const isLoading = ref(false)

// const fetchElections = async (): Promise<Election[]> => {
//   if (!electionsAddress.value) {
//     console.log('No Elections contract found for this team')
//     return []
//   }

//   try {
//     isLoading.value = true

//     const electionsList: Election[] = []

//     // Since there's no getElectionCount function, we'll try to fetch elections sequentially
//     // starting from ID 1 until we hit an error (which means no more elections)
//     let electionId = 1
//     let consecutiveErrors = 0
//     const maxConsecutiveErrors = 3 // Stop after 3 consecutive errors
//     const maxElections = 100 // Safety limit

//     while (
//       consecutiveErrors < maxConsecutiveErrors &&
//       electionId <= maxElections &&
//       electionsList.length < 3
//     ) {
//       try {
//         const election = (await readContract(config, {
//           address: electionsAddress.value,
//           abi: ELECTIONS_ABI,
//           functionName: 'getElection',
//           args: [BigInt(electionId)]
//         })) as readonly [bigint, string, string, `0x${string}`, bigint, bigint, bigint, boolean]

//         // If we get an election with id 0, it means it doesn't exist
//         if (election[0] === 0n) {
//           consecutiveErrors++
//         } else {
//           // Reset consecutive errors counter when we find a valid election
//           consecutiveErrors = 0

//           // Convert the election data to match our expected format
//           const formattedElection = {
//             id: Number(election[0]),
//             title: election[1],
//             description: election[2],
//             createdBy: election[3],
//             startDate: new Date(Number(election[4]) * 1000),
//             endDate: new Date(Number(election[5]) * 1000),
//             seatCount: Number(election[6]),
//             resultsPublished: election[7]
//           }

//           // Only add published elections to past elections
//           if (formattedElection.resultsPublished) {
//             electionsList.push(formattedElection)
//           }
//         }

//         electionId++
//       } catch {
//         // Error fetching this election ID, likely doesn't exist
//         // console.warn(`Error fetching election ID ${electionId}:`, err)
//         consecutiveErrors++
//         electionId++
//       }
//     }

//     // Sort elections by ID in descending order (latest first)
//     electionsList.sort((a, b) => b.id - a.id)

//     return electionsList
//   } catch (err) {
//     log.error('Error fetching elections: ', parseError(err))
//     return []
//   } finally {
//     isLoading.value = false
//   }
// }

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

const elections = computed(() => pastElections.value ?? [])
</script>
