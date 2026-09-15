<template>
  <UCard>
    <template #header>Candidates</template>
    <div class="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <ElectionCandidateCard
        v-for="candidate in candidates"
        :key="candidate.address"
        :candidate="candidate"
        :is-loading="isLoadingCastVote"
        @cast-vote="castVote"
      />
    </div>
  </UCard>
</template>

<script lang="ts" setup>
import ElectionCandidateCard from './ElectionCandidateCard.vue'
import { computed, watch } from 'vue'
import { electionsAbi } from '@/artifacts/abi/generated'
import { useTeamStore, useUserDataStore } from '@/stores'
import type { Address } from 'viem'
import {
  useElectionsAddress,
  useElectionsCastVote,
  useElectionsGetCandidateVoteCounts,
  useElectionsGetResults,
  useElectionsGetVoterChoice,
  useElectionsHasVoted,
  useBoDElections
} from '@/composables/elections'
import { simulateContract } from '@wagmi/core'
import type { User } from '@/types'
import { config } from '@/wagmi.config'
import { classifyError } from '@/utils/errors/classifyContractError'
import { log } from '@/lib/logging'
import { useTeamWriteGuard } from '@/composables/useTeamWriteGuard'

const props = defineProps<{ electionId: bigint }>()
const teamStore = useTeamStore()
const toast = useToast()
const electionId = computed(() => props.electionId)

const electionsAddress = useElectionsAddress()
const userDataStore = useUserDataStore()
const { candidateList, voteCount, electionStatus } = useBoDElections(electionId)
const voter = computed(() => userDataStore.address as Address | undefined)
const { data: candidateVoteCounts, error: errorCandidateVoteCounts } =
  useElectionsGetCandidateVoteCounts(electionId, candidateList)
const { data: hasVoted, error: errorHasVoted } = useElectionsHasVoted(electionId, voter)
const { data: voterChoice } = useElectionsGetVoterChoice(electionId, voter)
const { data: electionResults } = useElectionsGetResults(electionId)
const { mutate: executeCastVote, isPending: isLoadingCastVote } = useElectionsCastVote()
const { isWriteDisabled, archivedTooltip } = useTeamWriteGuard()

const totalVotes = computed(() => Number(voteCount.value ?? 0))
const isVoteDisabled = computed(
  () =>
    isWriteDisabled.value ||
    hasVoted.value === true ||
    electionStatus.value?.text === 'Upcoming' ||
    electionStatus.value?.text === 'Completed'
)
const voteTooltip = computed(() => archivedTooltip.value)

const membersByAddress = computed(
  () =>
    new Map(
      (teamStore.currentTeam?.members ?? []).map((member) => [
        member.address.toLowerCase(),
        member as User & { role?: string }
      ])
    )
)

const candidates = computed(() =>
  (candidateList.value ?? []).map((address) => {
    const member = membersByAddress.value.get(address.toLowerCase())

    return {
      address,
      name: member?.name || 'Unknown',
      role: member?.role || 'Candidate',
      imageUrl: member?.imageUrl,
      currentVotes: Number(candidateVoteCounts.value?.[address] ?? 0n),
      totalVotes: totalVotes.value,
      isSelected:
        hasVoted.value === true && voterChoice.value?.toLowerCase() === address.toLowerCase(),
      isElectionWinner:
        electionStatus.value?.text === 'Completed' &&
        (electionResults.value?.some((winner) => winner.toLowerCase() === address.toLowerCase()) ??
          false),
      isVoteDisabled: isVoteDisabled.value,
      voteTooltip: voteTooltip.value
    }
  })
)

watch(errorCandidateVoteCounts, (error) => {
  if (error) log.error('Error fetching candidate vote counts:', error)
})

watch(errorHasVoted, (error) => {
  if (error) log.error('Error checking vote status:', error)
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

  // The write layer refreshes the ballot as one bounded set: the total, grouped
  // candidate counts and this voter's choice settle without re-fetching the
  // immutable election record that owns the page.
  executeCastVote(
    { args },
    {
      onSuccess: () => {
        toast.add({ title: 'Vote Casted successfully!', color: 'success' })
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
</script>
