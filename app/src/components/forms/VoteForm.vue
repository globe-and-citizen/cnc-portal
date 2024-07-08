<template>
  <div>
    <h2>Vote</h2>
    <hr />
    <div v-if="proposal.isElection">
      <div
        v-for="candidate in proposal.candidates"
        :key="candidate.candidateAddress"
        class="form-control"
      >
        <label class="m-2 label cursor-pointer border rounded-lg">
          <span class="label-text">{{ candidate.name }} | {{ candidate.candidateAddress }}</span>
          <input
            type="radio"
            name="candidate"
            class="radio"
            :value="candidate.candidateAddress"
            v-model="selectedCandidate"
          />
        </label>
      </div>
    </div>
    <div v-else>
      <div class="form-control">
        <label class="label">
          <span class="label-text">Yes</span>
          <input type="radio" name="option" class="radio" value="1" v-model="selectedOption" />
        </label>
      </div>
      <div class="form-control">
        <label class="label">
          <span class="label-text">No</span>
          <input type="radio" name="option" class="radio" value="0" v-model="selectedOption" />
        </label>
      </div>
      <div class="form-control">
        <label class="label">
          <span class="label-text">Abstain</span>
          <input type="radio" name="option" class="radio" value="2" v-model="selectedOption" />
        </label>
      </div>
    </div>
    <div class="flex justify-center">
      <button class="btn btn-primary mt-4" @click="castVote">Cast Vote</button>
      <LoadingButton v-if="castingElectionVote || castingDirectiveVote" color="primary min-w-24" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVoteElection, useVoteDirective } from '@/composables/voting'
import type { Proposal } from '@/types/index'
import { useRoute } from 'vue-router'
import { ref } from 'vue'
import LoadingButton from '../LoadingButton.vue'
const selectedCandidate = ref<string>()
const selectedOption = ref<string | null>(null)

const route = useRoute()
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

defineModel({
  default: {
    title: '',
    description: '',
    candidates: [
      {
        name: '',
        candidateAddress: ''
      }
    ],
    isElection: false
  }
})
const props = defineProps<{
  proposal: Partial<Proposal>
}>()

const castVote = () => {
  console.log('castVote')
  if (props.proposal.isElection) {
    voteElection(
      Number(route.params.id),
      Number(props.proposal.id),
      selectedCandidate.value ? selectedCandidate.value : ''
    )
  } else {
    voteDirective(Number(route.params.id), Number(props.proposal.id), Number(selectedOption.value))
  }
}
</script>
