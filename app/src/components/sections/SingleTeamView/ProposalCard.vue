<template>
  <div class="card shadow-xl" :class="`${proposal.isElection ? 'bg-green-100' : 'bg-blue-100'}`">
    <div class="card-body flex flex-row justify-between">
      <div class="w-1/2">
        <h2 class="card-title">{{ proposal.title }}</h2>
        <span class="text-xs">
          <span class="badge badge-primary badge-xs">
            {{
              team.members.find((member: Member) => member.address === proposal.draftedBy)?.name ||
              'Unknown'
            }}</span
          >

          <!-- on
          <span class="badge badge-secondary badge-xs">
            {{ new Date().toLocaleDateString() }}</span
          > -->
        </span>
        <p class="text-sm">
          {{
            proposal.description
              ? proposal.description.length > 120
                ? proposal.description.substring(0, 120) + '...'
                : proposal.description
              : ''
          }}
        </p>
      </div>
      <div class="w-1/2 h-24" v-if="!proposal.isElection">
        <PieChart :data="chartData" title="Directive" />
      </div>
      <div class="w-1/2 h-24" v-else>
        <PieChart :data="chartData" title="Election" />
      </div>
    </div>
    <div class="flex justify-center gap-4 mb-2" v-if="!isDone">
      <button class="btn btn-primary btn-sm" @click="showVoteModal = true">Vote</button>
      <button class="btn btn-secondary btn-sm" @click="showProposalDetailsModal = true">
        View
      </button>
      <button class="btn btn-error btn-sm" @click="showConcludeConfirmModal = true">Stop</button>
    </div>
    <div class="flex justify-center gap-4 mb-2" v-else>
      <button class="btn btn-secondary btn-sm" @click="showProposalDetailsModal = true">
        View
      </button>
    </div>
    <ModalComponent v-model="showConcludeConfirmModal">
      <h2>Conclude</h2>
      <hr />
      <span class="mt-4">Are you sure you want to conclude this proposal?</span>
      <div class="flex justify-center">
        <LoadingButton v-if="concludingProposal" color="error mt-4 min-w-16 btn-sm" />
        <button
          v-else
          class="btn btn-sm btn-error mt-4"
          @click="concludeProposal(team.votingAddress, Number(proposal.id))"
        >
          Yes
        </button>
      </div>
    </ModalComponent>
    <ModalComponent v-model="showVoteModal">
      <VoteForm
        :team="team"
        :isLoading="castingElectionVote || castingDirectiveVote || isConfirmingVoteElection"
        v-model="voteInput"
        @voteElection="
          (value) =>
            voteElection({
              address: props.team.votingAddress as Address,
              abi: VotingABI,
              functionName: 'voteElection',
              args: [value.proposalId, value.candidateAddress]
            })
        "
        :proposal="proposal"
        @voteDirective="
          (value) => voteDirective(team.votingAddress, value.proposalId, value.option)
        "
      />
    </ModalComponent>
    <ModalComponent v-model="showProposalDetailsModal">
      <ProposalDetails :proposal="proposal" :team="team" />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useVoteElection, useVoteDirective, useConcludeProposal } from '@/composables/voting'
import VotingABI from '@/artifacts/abi/voting.json'
import VoteForm from '@/components/sections/SingleTeamView/forms/VoteForm.vue'
import ProposalDetails from '@/components/sections/SingleTeamView/ProposalDetails.vue'
import ModalComponent from '@/components/ModalComponent.vue'
import LoadingButton from '@/components/LoadingButton.vue'
import PieChart from '@/components/PieChart.vue'
import type { Member, Proposal } from '@/types'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import type { Address } from 'viem'

const { addSuccessToast, addErrorToast } = useToastStore()
const chartData = computed(() => {
  const votes = props.proposal.votes || {}
  if (props.proposal.isElection) {
    interface Candidate {
      votes?: number
      name: string
      candidateAddress: string
    }
    return (props.proposal as Partial<Proposal>)?.candidates?.map((candidate: Candidate) => {
      const member = props.team.members.find(
        (member: Member) => member.address === candidate.candidateAddress
      )
      return {
        value: Number(candidate.votes) || 0,
        name: member ? member.name : 'Unknown'
      }
    })
  } else {
    return [
      { value: Number(votes.yes) || 0, name: 'Yes' },
      { value: Number(votes.no) || 0, name: 'No' },
      { value: Number(votes.abstain) || 0, name: 'Abstain' }
    ]
  }
})

const props = defineProps(['proposal', 'isDone', 'team'])

const emits = defineEmits(['getTeam'])

const voteInput = ref<{
  title: ''
  description: ''
  candidates: [
    {
      name: ''
      candidateAddress: ''
    }
  ]
  isElection: false
}>()
const showVoteModal = ref(false)
const showConcludeConfirmModal = ref(false)
const showProposalDetailsModal = ref(false)

const {
  execute: concludeProposal,
  isLoading: concludingProposal,
  error: concludeError,
  isSuccess: concludeSuccess
} = useConcludeProposal()
const {
  writeContract: voteElection,
  data: hashVoteElection,
  isPending: castingElectionVote,
  error: electionError
} = useWriteContract()
const { isLoading: isConfirmingVoteElection, isSuccess: isConfirmedVoteElection } =
  useWaitForTransactionReceipt({
    hash: hashVoteElection
  })
watch(isConfirmingVoteElection, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedVoteElection.value) {
    addSuccessToast('Election vote casted')
    showVoteModal.value = false
    emits('getTeam')
  }
})

const {
  execute: voteDirective,
  isLoading: castingDirectiveVote,
  error: directiveError,
  isSuccess: directiveSuccess
} = useVoteDirective()

watch(electionError, () => {
  if (electionError.value) {
    addErrorToast('Error casting election vote')
  }
})
watch(directiveSuccess, () => {
  if (directiveSuccess.value) {
    addSuccessToast('Directive vote casted')
    showVoteModal.value = false
    emits('getTeam')
  }
})
watch(directiveError, () => {
  if (directiveError.value) {
    addErrorToast('Error casting directive vote')
  }
})
watch(concludeSuccess, () => {
  if (concludeSuccess.value) {
    addSuccessToast('Proposal concluded')
    showConcludeConfirmModal.value = false
    emits('getTeam')
  }
})
watch(concludeError, () => {
  if (concludeError.value) {
    addErrorToast('Error concluding proposal')
  }
})
</script>
