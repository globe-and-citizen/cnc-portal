<template>
  <div v-if="team.votingAddress">
    <div>
      <div class="flex flex-col" v-if="!loadingGetProposals" data-test="parent-div">
        <div class="flex justify-between">
          <div>
            <h2>Proposals</h2>
            <!-- <span
          class="badge badge-sm"
          :class="`${team.ownerAddress == useUserDataStore().address ? 'badge-primary' : 'badge-secondary'}`"
          >{{ team.bankAddress }}</span
        > -->
          </div>
          <div class="flex justify-between gap-4">
            <button class="btn btn-primary btn-md" @click="showModal = !showModal">
              Create Proposal
            </button>
            <button
              class="btn btn-secondary"
              v-if="team.boardOfDirectorsAddress"
              @click="
                () => {
                  executeGetBoardOfDirectors(String(team.boardOfDirectorsAddress))
                  showBoDModal = true
                }
              "
            >
              View BoD
            </button>
            <button class="btn btn-md btn-secondary" @click="showVotingControlModal = true">
              Manage
            </button>
          </div>
          <ModalComponent v-model="showVotingControlModal">
            <VotingManagement :team="team" />
          </ModalComponent>
        </div>
        <TabNavigation :initial-active-tab="0" :tabs="tabs" class="w-full">
          <template #tab-0>
            <ProposalCard
              v-for="proposal in activeProposals"
              :proposal="proposal"
              class="mt-10"
              :team="team"
              :key="proposal.title"
              @getTeam="emits('getTeam')"
            />
          </template>
          <template #tab-1>
            <ProposalCard
              v-for="proposal in oldProposals"
              :proposal="proposal"
              :team="team"
              :isDone="true"
              class="mt-10"
              :key="proposal.title"
            />
          </template>
        </TabNavigation>
        <ModalComponent v-model="showBoDModal">
          <h3>Board Of Directors</h3>
          <hr />
          <div class="mt-4">
            <ul v-if="boardOfDirectors?.length">
              <li
                v-for="(address, index) in boardOfDirectors"
                :key="index"
                class="text-sm flex justify-between"
              >
                <span v-if="team.members">
                  {{ team.members.find((member) => member.address === address)?.name || 'Unknown' }}
                </span>
                {{ address }}
              </li>
            </ul>
            <p v-else>No Board of Directors found.</p>
          </div>
        </ModalComponent>
        <ModalComponent v-model="showModal">
          <CreateProposalForm
            v-model="newProposalInput"
            @createProposal="createProposal"
            :isLoading="loadingAddProposal"
          />
        </ModalComponent>
      </div>
    </div>
    <div class="flex justify-center items-center" v-if="loadingGetProposals">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>
</template>
<script setup lang="ts">
import ProposalCard from '@/components/sections/SingleTeamView/ProposalCard.vue'
import type { Proposal } from '@/types/index'
import { onMounted, ref, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateProposalForm from '@/components/sections/SingleTeamView/forms/CreateProposalForm.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import { ProposalTabs } from '@/types/index'
import { useAddProposal, useGetProposals } from '@/composables/voting'
import { useGetBoardOfDirectors } from '@/composables/bod'
import type { Team } from '@/types/index'
import { useRoute } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import VotingManagement from '@/components/sections/SingleTeamView/VotingManagement.vue'

const props = defineProps<{ team: Partial<Team> }>()
const showVotingControlModal = ref(false)
const emits = defineEmits(['getTeam'])
const { addSuccessToast, addErrorToast } = useToastStore()
const {
  boardOfDirectors,
  execute: executeGetBoardOfDirectors,
  error: errorGetBoardOfDirectors
} = useGetBoardOfDirectors()

watch(errorGetBoardOfDirectors, () => {
  if (errorGetBoardOfDirectors.value) {
    addErrorToast('Failed to get board of directors')
  }
})

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
    addErrorToast('Failed to get proposals')
  }
})
watch(isSuccessAddProposal, () => {
  if (isSuccessAddProposal.value) {
    addSuccessToast('Proposal created successfully')
    emits('getTeam')
  }
})
watch(errorAddProposal, () => {
  if (errorAddProposal.value) {
    addErrorToast('Failed to create proposal')
  }
})

const showModal = ref(false)
const showBoDModal = ref(false)
const tabs = ref([ProposalTabs.Ongoing, ProposalTabs.Done])

const route = useRoute()

const newProposalInput = ref<Partial<Proposal>>({
  title: '',
  description: '',
  isElection: false,
  voters: [],
  candidates: [],
  winnerCount: 0,
  teamId: Number(route.params.id)
})

const createProposal = () => {
  newProposalInput.value.voters = props.team.members?.map((member) => {
    return {
      name: member.name,
      memberAddress: member.address
    }
  })
  if (props.team.votingAddress) executeAddProposal(props.team.votingAddress, newProposalInput.value)
}
const oldProposals = ref<Partial<Proposal>[]>([])
const activeProposals = ref<Partial<Proposal>[]>([])

onMounted(() => {
  if (props.team.votingAddress) executeGetProposals(props.team.votingAddress)
})
</script>
