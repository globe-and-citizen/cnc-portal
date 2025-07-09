<template>
  <div>
    <h2>Vote</h2>
    <hr />
    <div v-if="true">
      <div v-for="candidate in electionCandidates" :key="candidate" class="form-control">
        <label class="m-2 label cursor-pointer border rounded-lg">
          <span class="label-text"
            >{{
              /*props.team*/ teamStore.currentTeam?.members.find(
                (member: Member) => member.address === candidate
              )?.name
            }}
            | {{ candidate }}</span
          >
          <input
            type="radio"
            name="candidate"
            class="radio"
            :value="candidate"
            v-model="selectedCandidate"
          />
        </label>
      </div>
    </div>
    <!-- <div v-else>
      <div class="form-control">
        <label class="label">
          <span class="label-text">Yes</span>
          <input
            type="radio"
            name="option"
            class="radio"
            value="1"
            v-model="selectedOption"
            data-test="yesButton"
          />
        </label>
      </div>
      <div class="form-control">
        <label class="label">
          <span class="label-text">No</span>
          <input
            type="radio"
            name="option"
            class="radio"
            value="0"
            v-model="selectedOption"
            data-test="noButton"
          />
        </label>
      </div>
      <div class="form-control">
        <label class="label">
          <span class="label-text">Abstain</span>
          <input
            type="radio"
            name="option"
            class="radio"
            value="2"
            v-model="selectedOption"
            data-test="abstainButton"
          />
        </label>
      </div>
    </div> -->
    <div class="flex justify-center mt-4">
      <ButtonUI :loading="isLoading" :disabled="isLoading" variant="primary" @click="castVote"
        >Cast Vote</ButtonUI
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Member, Proposal, Team } from '@/types/index'
import { useRoute } from 'vue-router'
import { computed, ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
import { useReadContract } from '@wagmi/vue'
import { useTeamStore } from '@/stores'
import type { Address } from 'viem'
import ElectionABI from '@/artifacts/abi/elections.json'

const teamStore = useTeamStore()
const route = useRoute()

const emits = defineEmits(['voteElection', 'voteDirective'])
const props = defineProps<{
  team?: Team
  proposal?: Partial<Proposal>
  isLoading?: boolean
}>()

const selectedCandidate = ref<string>()
const selectedOption = ref<string | null>(null)

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

const castVote = () => {
  // if (props.proposal.isElection) {
  emits('voteElection', {
    teamId: Number(route.params.id),
    proposalId: Number(currentElectionId.value),
    candidateAddress: selectedCandidate.value ? selectedCandidate.value : ''
  })
  // } else {
  //   emits('voteDirective', {
  //     teamId: Number(route.params.id),
  //     proposalId: Number(props.proposal.id),
  //     option: Number(selectedOption.value)
  //   })
  // }
}
</script>
