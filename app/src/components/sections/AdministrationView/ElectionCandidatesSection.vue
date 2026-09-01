<template>
  <UCard>
    <template #header>Candidates</template>
    <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <ElectionCandidateCard
        v-for="(election, index) in candidates"
        :key="index"
        :election="election"
        @cast-vote="castVote"
        :is-loading="isLoadingCastVote"
      />
    </div>
  </UCard>
</template>

<script lang="ts" setup>
import ElectionCandidateCard from './ElectionCandidateCard.vue'
import { computed, reactive, watch } from 'vue'
import { electionsAbi } from '@/artifacts/abi/generated'
import { useTeamStore } from '@/stores'
import { zeroAddress, type Address } from 'viem'
import { useReadContract } from '@wagmi/vue'
import { useElectionsCastVote } from '@/composables/elections/writes'
import { readContract, simulateContract } from '@wagmi/core'
import type { User } from '@/types'
import { config } from '@/wagmi.config'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'

const props = defineProps<{ electionId: bigint }>()
const teamStore = useTeamStore()
const toast = useToast()
const electionId = computed(() => props.electionId)

const votesPerCandidate = reactive<Record<Address, number>>({})

const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

const { data: electionCandidates /*, error: errorElectionCandidates*/ } = useReadContract({
  functionName: 'getElectionCandidates',
  address: electionsAddress,
  abi: electionsAbi,
  args: [electionId],
  query: { enabled: true }
})

const { data: election /*, error: errorVoteCount*/ } = useReadContract({
  functionName: 'getElection',
  address: electionsAddress,
  abi: electionsAbi,
  args: [electionId],
  query: { enabled: computed(() => !!electionId.value) }
})

const {
  data: voteCount
  // isLoading: isLoadingVoteCount,
} = useReadContract({
  functionName: 'getVoteCount',
  address: electionsAddress,
  abi: electionsAbi,
  args: [electionId], // Supply currentElectionId as an argument
  query: {
    enabled: computed(() => !!electionId.value) // Only fetch if currentElectionId is available
  }
})

const { mutate: executeCastVote, isPending: isLoadingCastVote } = useElectionsCastVote()

type ElectionTuple = [bigint, string, string, Address, bigint, bigint, bigint, boolean]

const electionTuple = computed<ElectionTuple | null>(() => {
  if (!Array.isArray(election.value) || election.value.length < 8) {
    return null
  }
  return election.value as unknown as ElectionTuple
})

const candidates = computed(() => {
  const tuple = electionTuple.value
  if (electionCandidates.value && Array.isArray(electionCandidates.value) && tuple) {
    return electionCandidates.value.map((candidate: Address) => {
      const user = teamStore.currentTeam?.members?.find(
        (member) => member.address === candidate
      ) as User & { role?: string }
      const currentVotes = votesPerCandidate[candidate] ?? 0
      return {
        id: BigInt(tuple[0]),
        user: {
          address: candidate,
          name: user?.name || 'Unknown',
          role: user?.role || 'Candidate',
          imageUrl: user?.imageUrl
        },
        totalVotes: Number(voteCount.value) || 0,
        currentVotes: currentVotes as number,
        startDate: new Date(Number(tuple[4]) * 1000),
        endDate: new Date(Number(tuple[5]) * 1000)
      }
    })
  } else return []
})

const castVote = async (candidateAddress: Address) => {
  if (!electionsAddress.value) {
    toast.add({ title: 'Elections contract address not found', color: 'error' })
    return
  }
  const args: readonly [bigint, Address] = [electionId.value, candidateAddress]

  // Simulated through the ABI, not as raw call data: a raw gas estimate leaves
  // viem nothing to decode the revert with, and every refusal the contract has
  // a name for — closed ballot, voter not registered, already voted — reaches
  // the user as the same shrug of an "Election action failed".
  try {
    await simulateContract(config, {
      address: electionsAddress.value,
      abi: electionsAbi,
      functionName: 'castVote',
      args
    })
  } catch (error) {
    log.error('Error simulating vote:', error)
    toast.add({
      title: classifyError(error, { contract: 'Elections' }).userMessage,
      color: 'error'
    })
    return
  }

  executeCastVote(
    { args },
    {
      onSuccess: async () => {
        toast.add({ title: 'Vote Casted successfully!', color: 'success' })
        await fetchVotes()
      },
      onError: (error) => {
        log.error('Error casting vote:', error)
        const classified = classifyError(error, { contract: 'Elections' })
        if (classified.category === 'user_rejected') return
        toast.add({ title: classified.userMessage, color: 'error' })
      }
    }
  )
}

const fetchVotes = async () => {
  try {
    if (!electionsAddress.value) {
      toast.add({ title: 'Elections contract address not found', color: 'error' })
      return
    }
    const candidatesList = electionCandidates.value as Address[]
    if (candidatesList && candidatesList.length > 0) {
      await Promise.all(
        candidatesList.map(async (candidate) => {
          const count = await readContract(config, {
            address: electionsAddress.value || zeroAddress,
            abi: electionsAbi,
            functionName: 'getVoteCounts',
            args: [props.electionId, candidate]
          })
          votesPerCandidate[candidate] = Number(count) || 0
        })
      )
    }
  } catch (error) {
    log.error('Error fetching votes:', error)
    toast.add({
      title: classifyError(error, { contract: 'Elections' }).userMessage,
      color: 'error'
    })
  }
}

watch(
  electionCandidates,
  async (newCandidates) => {
    if (newCandidates) {
      await fetchVotes()
    }
  },
  { immediate: true, deep: true }
)
</script>
