<template>
  <div v-if="isLoading" class="flex w-full h-96 justify-center items-center">
    <div class="text-gray-500">Loading proposals...</div>
  </div>
  <div v-else-if="error" class="flex w-full h-96 justify-center items-center">
    <div class="text-red-500">Error loading proposals: {{ error.message }}</div>
  </div>
  <div v-else-if="proposals.length === 0" class="flex w-full h-96 justify-center items-center">
    <div class="text-gray-500">No proposals available</div>
  </div>
  <div v-else>
    <ProposalsCard v-for="proposal in proposals" :key="Number(proposal.id)" v-bind="proposal" />
  </div>
</template>
<script setup lang="ts">
import { type Proposal } from '@/types'
import ProposalsCard from '@/components/sections/ProposalsView/ProposalsCard.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useTeamStore } from '@/stores'
import { readContract } from '@wagmi/core'
import { config } from '@/wagmi.config'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import type { Address } from 'viem'

const teamStore = useTeamStore()
const proposals = ref<Proposal[]>([])
const isLoading = ref(false)
const error = ref<Error | null>(null)

// Get the Proposals contract address from the team store
const proposalsAddress = computed(
  () => teamStore.getContractAddressByType('Proposals') as Address | undefined
)

const fetchProposals = async () => {
  if (!proposalsAddress.value) {
    console.log('No Proposals contract found for this team')
    return
  }

  try {
    isLoading.value = true
    error.value = null

    const proposalsList: Proposal[] = []

    // Since there's no getProposalCount function, we'll try to fetch proposals sequentially
    // starting from ID 1 until we hit an error (which means no more proposals)
    let proposalId = 1
    let consecutiveErrors = 0
    const maxConsecutiveErrors = 3 // Stop after 3 consecutive errors
    const maxProposals = 100 // Safety limit

    while (consecutiveErrors < maxConsecutiveErrors && proposalId <= maxProposals) {
      try {
        const proposal = (await readContract(config as any, {
          address: proposalsAddress.value,
          abi: PROPOSALS_ABI,
          functionName: 'getProposal',
          args: [BigInt(proposalId)]
        })) as any

        // If we get a proposal with id 0, it means it doesn't exist
        if (proposal.id === 0n) {
          consecutiveErrors++
        } else {
          // Reset consecutive errors counter when we find a valid proposal
          consecutiveErrors = 0

          // Convert the proposal data to match our Proposal type
          const formattedProposal: Proposal = {
            id: proposal.id,
            title: proposal.title,
            description: proposal.description,
            proposalType: proposal.proposalType,
            startDate: proposal.startDate,
            endDate: proposal.endDate,
            creator: proposal.creator,
            voteCount: proposal.voteCount,
            totalVoters: proposal.totalVoters,
            yesCount: proposal.yesCount,
            noCount: proposal.noCount,
            abstainCount: proposal.abstainCount,
            state: proposal.state
          }

          proposalsList.push(formattedProposal)
        }

        proposalId++
      } catch (err) {
        // Error fetching this proposal ID, likely doesn't exist
        consecutiveErrors++
        proposalId++
      }
    }

    // Sort proposals by ID in descending order (latest first)
    proposalsList.sort((a, b) => Number(b.id) - Number(a.id))

    proposals.value = proposalsList
  } catch (err) {
    console.error('Error fetching proposals:', err)
    error.value = err instanceof Error ? err : new Error('Failed to fetch proposals')
  } finally {
    isLoading.value = false
  }
}

// Watch for changes in the proposals address and refetch
watch(proposalsAddress, (newAddress) => {
  if (newAddress) {
    fetchProposals()
  }
})

// Fetch proposals when component mounts
onMounted(() => {
  if (proposalsAddress.value) {
    fetchProposals()
  }
})

// Expose refresh function for parent components
defineExpose({
  refreshProposals: fetchProposals
})
</script>
