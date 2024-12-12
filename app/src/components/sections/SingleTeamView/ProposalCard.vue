<template>
  <div
    class="card shadow-xl"
    :class="`${proposal.isElection ? 'bg-green-100' : 'bg-blue-100'}`"
    data-test="proposal-card"
  >
    <div class="card-body flex flex-row justify-between">
      <div class="w-1/2">
        <h2 class="card-title" data-test="proposal-title">{{ proposal.title }}</h2>
        <span class="text-xs">
          <span class="badge badge-primary badge-xs" data-test="proposal-drafter">
            {{
              team.members.find((member: Member) => member.address === proposal.draftedBy)?.name ||
              'Unknown'
            }}</span
          >
        </span>
        <p class="text-sm" data-test="proposal-description">
          {{
            proposal.description
              ? proposal.description.length > 120
                ? proposal.description.substring(0, 120) + '...'
                : proposal.description
              : ''
          }}
        </p>
      </div>
      <div class="w-1/2 h-24" v-if="!proposal.isElection" data-test="directive-chart">
        <PieChart :data="chartData" title="Directive" />
      </div>
      <div class="w-1/2 h-24" v-else data-test="election-chart">
        <PieChart :data="chartData" title="Election" />
      </div>
    </div>
    <div class="flex justify-center gap-4 mb-2" v-if="!isDone" data-test="active-proposal-actions">
      <button class="btn btn-primary btn-sm" @click="showVoteModal = true" data-test="vote-button">
        Vote
      </button>
      <button
        class="btn btn-secondary btn-sm"
        @click="showProposalDetailsModal = true"
        data-test="view-active-button"
      >
        View
      </button>
      <button
        class="btn btn-error btn-sm"
        @click="showConcludeConfirmModal = true"
        data-test="stop-button"
      >
        Stop
      </button>
    </div>
    <div class="flex justify-center gap-4 mb-2" v-else data-test="concluded-proposal-actions">
      <button
        class="btn btn-secondary btn-sm"
        @click="showProposalDetailsModal = true"
        data-test="view-concluded-button"
      >
        View
      </button>
    </div>
    <ModalComponent
      v-model="showConcludeConfirmModal"
      data-test="conclude-modal"
      ref="conclude-modal"
    >
      <h2>Conclude</h2>
      <hr />
      <span class="mt-4">Are you sure you want to conclude this proposal?</span>
      <div class="flex justify-center">
        <LoadingButton
          v-if="concludingProposal || isConfirmingConcludeProposal"
          color="error mt-4 min-w-16 btn-sm"
          data-test="conclude-loading-button"
        />
        <button
          v-else
          class="btn btn-sm btn-error mt-4"
          data-test="conclude-confirm-button"
          @click="
            concludeProposal({
              address: props.team.votingAddress as Address,
              abi: VotingABI,
              functionName: 'concludeProposal',
              args: [Number(proposal.id)]
            })
          "
        >
          Yes
        </button>
      </div>
    </ModalComponent>
    <ModalComponent v-model="showVoteModal" data-test="vote-modal" ref="vote-modal">
      <VoteForm
        :team="team"
        :isLoading="
          castingElectionVote ||
          castingDirectiveVote ||
          isConfirmingVoteElection ||
          isConfirmingVoteDirective
        "
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
          (value) =>
            voteDirective({
              address: props.team.votingAddress as Address,
              abi: VotingABI,
              functionName: 'voteDirective',
              args: [value.proposalId, value.option]
            })
        "
      />
    </ModalComponent>
    <ModalComponent
      v-model="showProposalDetailsModal"
      data-test="details-modal"
      ref="details-modal"
    >
      <ProposalDetails :proposal="proposal" :team="team" />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
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
  writeContract: concludeProposal,
  isPending: concludingProposal,
  error: concludeError,
  data: hashConcludeProposal
} = useWriteContract()
const { isLoading: isConfirmingConcludeProposal, isSuccess: isConfirmedConcludeProposal } =
  useWaitForTransactionReceipt({
    hash: hashConcludeProposal
  })
watch(isConfirmingConcludeProposal, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedConcludeProposal.value) {
    addSuccessToast('Proposal concluded')
    showConcludeConfirmModal.value = false
    emits('getTeam')
  }
})
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
  writeContract: voteDirective,
  isPending: castingDirectiveVote,
  error: directiveError,
  data: hashVoteDirective
} = useWriteContract()

const { isLoading: isConfirmingVoteDirective, isSuccess: isConfirmedVoteDirective } =
  useWaitForTransactionReceipt({
    hash: hashVoteDirective
  })
watch(isConfirmingVoteDirective, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedVoteDirective.value) {
    addSuccessToast('Directive vote casted')
    showVoteModal.value = false
    emits('getTeam')
  }
})
watch(electionError, () => {
  if (electionError.value) {
    addErrorToast('Error casting election vote')
  }
})

watch(directiveError, () => {
  if (directiveError.value) {
    addErrorToast('Error casting directive vote')
  }
})

watch(concludeError, () => {
  if (concludeError.value) {
    addErrorToast('Error concluding proposal')
  }
})
</script>
