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
          <span class="label-text"
            >{{
              props.team.members.find(
                (member: Member) => member.address === (candidate as any).candidateAddress
              )?.name
            }}
            | {{ candidate.candidateAddress }}</span
          >
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
    </div>
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
import { ref } from 'vue'
import ButtonUI from '@/components/ButtonUI.vue'
const selectedCandidate = ref<string>()
const selectedOption = ref<string | null>(null)

const route = useRoute()
const emits = defineEmits(['voteElection', 'voteDirective'])
const props = defineProps<{
  team: Team
  proposal: Partial<Proposal>
  isLoading: boolean
}>()

const castVote = () => {
  if (props.proposal.isElection) {
    emits('voteElection', {
      teamId: Number(route.params.id),
      proposalId: Number(props.proposal.id),
      candidateAddress: selectedCandidate.value ? selectedCandidate.value : ''
    })
  } else {
    emits('voteDirective', {
      teamId: Number(route.params.id),
      proposalId: Number(props.proposal.id),
      option: Number(selectedOption.value)
    })
  }
}
</script>
