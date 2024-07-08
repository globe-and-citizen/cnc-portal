<template>
  <div class="card shadow-xl" :class="`${proposal.isElection ? 'bg-green-100' : 'bg-blue-100'}`">
    <div class="card-body flex flex-row justify-between">
      <div class="w-1/2">
        <h2 class="card-title">{{ proposal.title }}</h2>
        <span class="text-xs">
          <span class="badge badge-primary badge-xs"> {{ proposal.draftedBy }}</span>

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
      <div
        class="flex flex-row items-center justify-center gap-5 w-1/2"
        v-if="!proposal.isElection"
      >
        <div class="flex flex-col items-center justify-center gap-2 text-sm">
          <span>Yes </span>
          <span>No </span>
          <span>Abstain </span>
        </div>
        <div class="flex flex-col items-center justify-center gap-5">
          <progress
            class="progress progress-success w-56"
            :value="Number(proposal.votes?.yes)"
            max="100"
          ></progress>
          <progress
            class="progress progress-success w-56"
            :value="Number(proposal.votes?.no)"
            max="100"
          ></progress>
          <progress
            class="progress progress-success w-56"
            :value="Number(proposal.votes?.abstain)"
            max="100"
          ></progress>
        </div>
      </div>
      <div class="flex flex-row items-center justify-center gap-5 w-1/2" v-else>
        <div class="flex flex-col items-center justify-center gap-2 text-sm">
          <span v-for="user in (proposal as any).candidates.slice(0, 3)" :key="user.address">{{
            user.name
          }}</span>
        </div>
        <div class="flex flex-col items-center justify-center gap-5">
          <progress
            class="progress progress-success w-56"
            v-for="user in (proposal as any).candidates.slice(0, 3)"
            :key="user.address"
            :value="Number(user?.votes)"
          ></progress>
        </div>
      </div>
    </div>
    <div class="flex justify-center gap-4 mb-2" v-if="!isDone">
      <button class="btn btn-primary btn-sm" @click="showVoteModal = true">Vote</button>
      <button class="btn btn-secondary btn-sm" @click="showPollDetailsModal = true">View</button>
      <button class="btn btn-error btn-sm" @click="showConcludeConfirmModal = true">Stop</button>
    </div>
    <div class="flex justify-center gap-4 mb-2" v-else>
      <button class="btn btn-secondary btn-sm" @click="showPollDetailsModal = true">View</button>
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
          @click="concludeProposal(Number($route.params.id), Number(proposal.id))"
        >
          Yes
        </button>
      </div>
    </ModalComponent>
    <ModalComponent v-model="showVoteModal">
      <VoteForm
        :isLoading="castingElectionVote || castingDirectiveVote"
        v-model="voteInput"
        @voteElection="
          (value) => voteElection(value.teamId, value.proposalId, value.candidateAddress)
        "
        :proposal="proposal"
        @voteDirective="(value) => voteDirective(value.teamId, value.proposalId, value.option)"
      />
    </ModalComponent>
    <ModalComponent v-model="showPollDetailsModal">
      <PollDetails :proposal="proposal" />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import type { Proposal } from '@/types/index'
import { ref, watch } from 'vue'
import { useToastStore } from '@/stores/useToastStore'
import { useVoteElection, useVoteDirective, useConcludeProposal } from '@/composables/voting'
import VoteForm from '@/components/forms/VoteForm.vue'
import PollDetails from '@/components/PollDetails.vue'
import ModalComponent from './ModalComponent.vue'
import LoadingButton from './LoadingButton.vue'
const { addSuccessToast, addErrorToast } = useToastStore()

defineProps<{
  proposal: Partial<Proposal>
  isDone?: boolean
}>()
const emits = defineEmits(['getTeam'])

const voteInput = ref<any>()
const showVoteModal = ref(false)
const showConcludeConfirmModal = ref(false)
const showPollDetailsModal = ref(false)

const {
  execute: concludeProposal,
  isLoading: concludingProposal,
  error: concludeError,
  isSuccess: concludeSuccess
} = useConcludeProposal()
const {
  execute: voteElection,
  isLoading: castingElectionVote,
  error: electionError,
  isSuccess: electionSuccess
} = useVoteElection()
const {
  execute: voteDirective,
  isLoading: castingDirectiveVote,
  error: directiveError,
  isSuccess: directiveSuccess
} = useVoteDirective()

watch(electionSuccess, () => {
  if (electionSuccess.value) {
    addSuccessToast('Election vote casted')
    showVoteModal.value = false
    emits('getTeam')
  }
})
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
