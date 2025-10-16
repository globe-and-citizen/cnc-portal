<template>
  <CardComponent title="Candidates">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
      <ElectionDetailsCard
        v-for="(election, index) in candidates"
        :key="index"
        :election="election"
        @cast-vote="castVote"
        :is-loading="isLoadingCastVote"
      />
    </div>
  </CardComponent>
</template>

<script lang="ts" setup>
import CardComponent from '@/components/CardComponent.vue'
import ElectionDetailsCard from './BoDElectionDetailsCard.vue'
import { computed, reactive, watch } from 'vue'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
// import { BOD_ABI } from '@/artifacts/abi/bod'
import { useTeamStore, useToastStore } from '@/stores'
import { encodeFunctionData, zeroAddress, type Abi, type Address } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from '@wagmi/vue'
import { estimateGas, readContract } from '@wagmi/core'
import type { User } from '@/types'
import { config } from '@/wagmi.config'
import { log, parseError } from '@/utils'
import { useQueryClient } from '@tanstack/vue-query'

const props = defineProps<{ electionId: bigint }>()
const queryClient = useQueryClient()
const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()
const electionId = computed(() => props.electionId)

const votesPerCandidate = reactive<Record<Address, number>>({})

const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections'))

const { data: electionCandidates /*, error: errorElectionCandidates*/ } = useReadContract({
  functionName: 'getElectionCandidates',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [electionId],
  query: { enabled: true }
})

const { data: election /*, error: errorVoteCount*/ } = useReadContract({
  functionName: 'getElection',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [electionId],
  query: { enabled: computed(() => !!electionId.value) }
})

const {
  data: voteCount
  // isLoading: isLoadingVoteCount,
} = useReadContract({
  functionName: 'getVoteCount',
  address: electionsAddress.value,
  abi: ELECTIONS_ABI,
  args: [electionId], // Supply currentElectionId as an argument
  query: {
    enabled: computed(() => !!electionId.value) // Only fetch if currentElectionId is available
  }
})

const {
  data: hashCastVote,
  writeContract: executeCastVote,
  isPending: isLoadingCastVote
} = useWriteContract()

const { isLoading: isConfirmingCastVote, isSuccess: isConfirmedCastVote } =
  useWaitForTransactionReceipt({
    hash: hashCastVote
  })

const candidates = computed(() => {
  if (
    electionCandidates.value &&
    Array.isArray(electionCandidates.value) &&
    Array.isArray(election.value)
  ) {
    return electionCandidates.value.map((candidate: Address) => {
      const user = teamStore.currentTeam?.members?.find(
        (member) => member.address === candidate
      ) as User & { role?: string }
      return {
        id: BigInt((election.value as string | bigint[])[0]),
        user: {
          address: candidate,
          name: user?.name || 'Unknown',
          role: user?.role || 'Candidate',
          imageUrl: user?.imageUrl
        },
        totalVotes: Number(voteCount.value) || 0,
        currentVotes: votesPerCandidate[candidate], //5
        startDate: new Date(Number((election.value as bigint[])[4]) * 1000),
        endDate: new Date(Number((election.value as bigint[])[5]) * 1000)
      }
    })
  } else return []
})

const castVote = async (candidateAddress: string) => {
  try {
    if (!electionsAddress.value) {
      addErrorToast('Elections contract address not found')
      return
    }
    const args = [electionId.value, candidateAddress]

    const data = encodeFunctionData({
      abi: ELECTIONS_ABI,
      functionName: 'castVote',
      args
    })

    await estimateGas(config, {
      to: electionsAddress.value,
      data
    })

    executeCastVote({
      address: electionsAddress.value,
      abi: ELECTIONS_ABI,
      functionName: 'castVote',
      args
    })
  } catch (error) {
    addErrorToast(parseError(error, ELECTIONS_ABI))
    log.error('Error creating election:', parseError(error, ELECTIONS_ABI))
  }
}

const fetchVotes = async () => {
  try {
    if (!electionsAddress.value) {
      addErrorToast('Elections contract address not found')
      return
    }
    const candidatesList = electionCandidates.value as Address[]
    if (candidatesList && candidatesList.length > 0) {
      await Promise.all(
        candidatesList.map(async (candidate) => {
          const count = await readContract(config, {
            address: electionsAddress.value || zeroAddress,
            abi: ELECTIONS_ABI,
            functionName: '_voteCounts',
            args: [props.electionId, candidate]
          })
          votesPerCandidate[candidate] = Number(count) || 0
        })
      )
    }
  } catch (error) {
    addErrorToast(parseError(error, ELECTIONS_ABI))
    log.error('Error fetching votes:', parseError(error, ELECTIONS_ABI))
  }
}

watch(isConfirmingCastVote, async (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedCastVote.value) {
    addSuccessToast('Vote Casted successfully!')
    await fetchVotes()
    await queryClient.invalidateQueries({
      queryKey: ['readContract']
    })
  }
})

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
