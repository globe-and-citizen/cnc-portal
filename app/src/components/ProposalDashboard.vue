<template>
  <div class="flex justify-center" v-if="!loadingGetProposals"></div>
  <div class="flex flex-col" v-if="!loadingGetProposals">
    <div class="flex justify-between">
      <div>
        <h2>Proposals</h2>
        <span
          class="badge badge-sm"
          :class="`${team.ownerAddress == useUserDataStore().address ? 'badge-primary' : 'badge-secondary'}`"
          >{{ team.bankAddress }}</span
        >
      </div>
      <div>
        <button class="btn btn-primary btn-md" @click="showModal = !showModal">
          Create Proposal
        </button>
      </div>
    </div>
    <TabNavigation :initial-active-tab="0" :tabs="tabs" class="w-full">
      <template #tab-0>
        <ProposalCard
          v-for="proposal in activeProposals"
          :proposal="proposal"
          class="mt-10"
          :key="proposal.title"
        />
      </template>
      <template #tab-1>
        <ProposalCard
          v-for="proposal in oldProposals"
          :proposal="proposal"
          :isDone="true"
          class="mt-10"
          :key="proposal.title"
        />
      </template>
    </TabNavigation>

    <ModalComponent v-model="showModal">
      <CreateProposalForm
        v-model="newProposalInput"
        @createProposal="createProposal"
        :isLoading="loadingAddProposal"
      />
    </ModalComponent>
  </div>
  <div class="flex justify-center items-center" v-if="loadingGetProposals">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
</template>
<script setup lang="ts">
import ProposalCard from '@/components/ProposalCard.vue'
import type { Proposal } from '@/types/index'
import { onMounted, ref, watch } from 'vue'
import ModalComponent from './ModalComponent.vue'
import CreateProposalForm from './forms/CreateProposalForm.vue'
import TabNavigation from './TabNavigation.vue'
import { ProposalTabs } from '@/types/index'
import { useAddProposal, useGetProposals } from '@/composables/voting'
import type { Team } from '@/types/index'
import LoadingButton from './LoadingButton.vue'
import { useRoute } from 'vue-router'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'

const emits = defineEmits(['getTeam'])
const { addSuccessToast, addErrorToast } = useToastStore()

const {
  execute: executeAddProposal,
  isLoading: loadingAddProposal,
  isSuccess: isSuccessAddProposal,
  error: errorAddProposal
} = useAddProposal()
const {
  execute: executeGetProposals,
  isLoading: loadingGetProposals,
  isSuccess: isSuccessGetProposals,
  error: errorGetProposals,
  data: proposals
} = useGetProposals()
watch(isSuccessGetProposals, () => {
  if (isSuccessGetProposals.value) {
    const proposalsList = Object.values(proposals.value)
    activeProposals.value = proposalsList.filter((proposal) => proposal.isActive)
    oldProposals.value = proposalsList.filter((proposal) => !proposal.isActive)
  }
})
watch(errorGetProposals, () => {
  if (errorGetProposals.value) {
    addErrorToast(
      errorGetProposals.value.reason ? errorGetProposals.value.reason : 'Failed to get proposals'
    )
  }
})
watch(isSuccessAddProposal, () => {
  if (isSuccessAddProposal.value) {
    console.log(isSuccessAddProposal.value)
    addSuccessToast('Proposal created successfully')
    emits('getTeam')
  }
})
watch(errorAddProposal, () => {
  if (errorAddProposal.value) {
    addErrorToast(
      errorAddProposal.value.reason ? errorAddProposal.value.reason : 'Failed to create proposal'
    )
  }
})

const showModal = ref(false)
const tabs = ref([ProposalTabs.Ongoing, ProposalTabs.Done])

const route = useRoute()

const props = defineProps<{ team: Partial<Team> }>()
const newProposalInput = ref<Partial<Proposal>>({
  title: '',
  description: '',
  draftedBy: '',
  isElection: false,
  voters: [],
  candidates: [],
  teamId: Number(route.params.id)
})

const createProposal = () => {
  newProposalInput.value.draftedBy = useUserDataStore().name
  newProposalInput.value.voters = props.team.members?.map((member) => {
    return {
      name: member.name,
      memberAddress: member.address
    }
  })

  executeAddProposal(newProposalInput.value)
}
const oldProposals = ref<Partial<Proposal>[]>([])
const activeProposals = ref<Partial<Proposal>[]>([])

onMounted(() => {
  executeGetProposals(Number(route.params.id))
})
</script>
