<template>
  <CardComponent title="Candidates">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
import { computed, ref, watch } from 'vue'
import ElectionABI from '@/artifacts/abi/elections.json'
// import BoDABI from '@/artifacts/abi/bod.json'
import { useTeamStore, useToastStore } from '@/stores'
import { encodeFunctionData, type Abi, type Address } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from '@wagmi/vue'
import { estimateGas } from '@wagmi/core'
import type { User } from '@/types'
import { config } from '@/wagmi.config'
import { log, parseError } from '@/utils'

const teamStore = useTeamStore()
const { addSuccessToast, addErrorToast } = useToastStore()

const electionsAddress = computed(() => {
  const address = teamStore.currentTeam?.teamContracts?.find((c) => c.type === 'Elections')?.address
  return address as Address
})

// Fetch next election ID
const {
  data: nextElectionId,
  // isLoading: isLoadingNextElectionId,
  error: errorNextElectionId
} = useReadContract({
  functionName: 'getNextElectionId',
  address: electionsAddress.value,
  abi: ElectionABI
})

// Compute current election ID
const currentElectionId = computed(() => {
  console.log('nextElectionId.value:', nextElectionId.value)
  if (
    nextElectionId.value &&
    (typeof nextElectionId.value === 'number' || typeof nextElectionId.value === 'bigint')
  ) {
    return Number(nextElectionId.value) - 1
  }
  return null // Handle cases where nextElectionId is not available
})

const { data: electionCandidates, error: errorElectionCandidates } = useReadContract({
  functionName: 'getElectionCandidates',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId]
})

const { data: electionresults, error: errorElectionResults } = useReadContract({
  functionName: 'getElectionResults',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId]
})

const { data: voteCount, error: errorVoteCount } = useReadContract({
  functionName: 'getVoteCount',
  address: electionsAddress.value,
  abi: ElectionABI,
  args: [currentElectionId]
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
  if (electionCandidates.value && Array.isArray(electionCandidates.value)) {
    return electionCandidates.value.map((candidate: Address) => {
      const user = teamStore.currentTeam?.members?.find(
        (member) => member.address === candidate
      ) as User & { role?: string }
      return {
        user: {
          address: candidate,
          name: user?.name || 'Unknown',
          role: user?.role || 'Candidate',
          imageUrl: user?.imageUrl
        },
        totalVotes: Number(voteCount.value) || 0,
        currentVotes: 5
      }
    })
  }
})

const castVote = async (candidateAddress: string) => {
  try {
    const args = [currentElectionId.value, candidateAddress]

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

watch(isConfirmingCastVote, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedCastVote.value) {
    addSuccessToast('Election created successfully!')
  }
})

watch(electionCandidates, (newCandidates) => {
  if (newCandidates && (newCandidates as string[]).length > 0) {
    console.log('Election candidates:', newCandidates)
  }
})

watch(electionresults, (newResults) => {
  if (newResults && Array.isArray(newResults)) {
    console.log('Election results:', newResults)
  }
})

const boardOfDirectors = [
  {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'Alice Johnson',
    role: 'Chairperson' /*,
		imageUrl: 'https://example.com/images/alice.jpg'*/
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    name: 'Bob Smith',
    role: 'Vice Chairperson' /*,
		imageUrl: 'https://example.com/images/bob.jpg'*/
  },
  {
    address: '0x7890abcdef1234567890abcdef12345678901234',
    name: 'Charlie Brown',
    role: 'Treasurer' /*,
		imageUrl: 'https://example.com/images/charlie.jpg'*/
  },
  {
    address: '0x4567890abcdef1234567890abcdef1234567890',
    name: 'Diana Prince',
    role: 'Secretary' /*,
		imageUrl: 'https://example.com/images/diana.jpg'*/
  },
  {
    address: '0xabcdef1234567890abcdef1234567890abcdef56',
    name: 'Ethan Hunt' /*,
		imageUrl: 'https://example.com/images/ethan.jpg'*/
  }
]

const pastElections = ref([
  {
    title: 'Q4 2023 Board Election',
    endDate: new Date('2023-12-15'),
    candidates: 5,
    currentVotes: 142,
    totalVotes: 1842,
    electedMembers: ['Alice Johnson', 'Bob Smith', 'Charlie Brown'],
    user: boardOfDirectors[0]
  },
  {
    title: 'Q3 2023 Committee Election',
    endDate: new Date('2023-09-20'),
    candidates: 3,
    currentVotes: 78,
    totalVotes: 956,
    electedMembers: ['Diana Prince', 'Ethan Hunt'],
    user: boardOfDirectors[1]
  },
  {
    title: 'Q2 2023 Audit Election',
    endDate: new Date('2023-06-10'),
    candidates: 4,
    currentVotes: 95,
    totalVotes: 1203,
    electedMembers: ['Frank Ocean', 'Grace Hopper', 'Henry Ford'],
    user: boardOfDirectors[2]
  },
  {
    title: 'Q1 2023 Audit Election',
    endDate: new Date('2023-06-10'),
    candidates: 4,
    currentVotes: 87,
    totalVotes: 1203,
    electedMembers: ['Frank Ocean', 'Grace Hopper', 'Henry Ford'],
    user: boardOfDirectors[3]
  }
])
</script>
