<template>
  <CardComponent title="Candidates">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
      <ElectionDetailsCard
        v-for="(election, index) in candidates"
        :key="index"
        :election="election"
        @cast-vote="castVote"
      />
    </div>
  </CardComponent>
</template>

<script lang="ts" setup>
import CardComponent from '@/components/CardComponent.vue'
import ElectionDetailsCard from './BoDElectionDetailsCard.vue'
import { computed, reactive, watch } from 'vue'
import ElectionABI from '@/artifacts/abi/elections.json'
// import BoDABI from '@/artifacts/abi/bod.json'
import { useTeamStore, useToastStore } from '@/stores'
import { encodeFunctionData, type Abi, type Address } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from '@wagmi/vue'
import { estimateGas, readContract } from '@wagmi/core'
import type { User } from '@/types'
import { config } from '@/wagmi.config'
import { log, parseError } from '@/utils'

const props = defineProps<{ electionId: bigint }>()

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

const votesPerCandidate = reactive<Record<Address, number>>({})

const electionsAddress = computed(() => teamStore.getContractAddressByType('Elections') as Address)

const { data: electionCandidates /*, error: errorElectionCandidates*/ } = useReadContract({
  functionName: 'getElectionCandidates',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [props.electionId]
})

const { data: election /*, error: errorVoteCount*/ } = useReadContract({
  functionName: 'getElection',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [props.electionId]
})

const {
  data: hashCastVote,
  writeContract: executeCastVote
  // isPending: isLoadingCastVote
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
        totalVotes: Number((election.value as string | bigint[])[6]) || 0,
        currentVotes: votesPerCandidate[candidate] //5
      }
    })
  } else return []
})

const castVote = async (candidateAddress: string) => {
  try {
    const args = [props.electionId, candidateAddress]

    const data = encodeFunctionData({
      abi: ElectionABI as Abi,
      functionName: 'castVote',
      args
    })

    await estimateGas(config, {
      to: electionsAddress.value,
      data
    })

    executeCastVote({
      address: electionsAddress.value,
      abi: ElectionABI,
      functionName: 'castVote',
      args
    })
  } catch (error) {
    addErrorToast(parseError(error, ElectionABI as Abi))
    log.error('Error creating election:', parseError(error, ElectionABI as Abi))
  }
}

const fetchVotes = async () => {
  try {
    const candidatesList = electionCandidates.value as Address[]
    if (candidatesList && candidatesList.length > 0) {
      await Promise.all(
        candidatesList.map(async (candidate) => {
          const count = await readContract(config, {
            address: electionsAddress.value,
            abi: ElectionABI,
            functionName: '_voteCounts',
            args: [props.electionId, candidate]
          })
          votesPerCandidate[candidate] = Number(count) || 0
        })
      )
    }
  } catch (error) {
    addErrorToast(parseError(error, ElectionABI as Abi))
    log.error('Error fetching votes:', parseError(error, ElectionABI as Abi))
  }
}

watch(isConfirmingCastVote, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedCastVote.value) {
    addSuccessToast('Election created successfully!')
  }
})

watch(
  electionCandidates,
  async (newCandidates) => {
    if (newCandidates) {
      await fetchVotes()
      addSuccessToast('Election candidates fetched successfully!')
    }
  },
  { immediate: true, deep: true }
)
</script>
