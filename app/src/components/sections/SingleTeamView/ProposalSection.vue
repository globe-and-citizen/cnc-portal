<template>
  <div v-if="team.votingAddress">
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
            class="btn btn-primary btn-md"
            @click="executeDeployBoDContract(String(route.params.id), team.votingAddress)"
            v-if="
              !(isLoadingBoDDeployment || isLoadingSetBoardOfDirectorsContractAddress) &&
              !team.boardOfDirectorsAddress
            "
          >
            Deploy BoD Contract
          </button>
          <LoadingButton
            color="primary min-w-28"
            v-if="isLoadingBoDDeployment || isLoadingSetBoardOfDirectorsContractAddress"
          />
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
        </div>
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
        {{ boardOfDirectors }}
      </ModalComponent>
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
  </div>
  <div class="flex justify-center items-center" v-else>
    <LoadingButton color="primary min-w-28" v-if="loadingDeployVotingContract" />
    <button
      v-else
      class="btn btn-primary btn-md"
      @click="executeVotingContract(String(route.params.id))"
    >
      Create Voting Contract
    </button>
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
import {
  useAddProposal,
  useGetProposals,
  useDeployVotingContract,
  useSetBoardOfDirectorsContractAddress
} from '@/composables/voting'
import { useDeployBoDContract, useGetBoardOfDirectors } from '@/composables/bod'
import type { Team } from '@/types/index'
import { useRoute } from 'vue-router'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'
import LoadingButton from '@/components/LoadingButton.vue'

const emits = defineEmits(['getTeam'])
const { addSuccessToast, addErrorToast } = useToastStore()
const {
  boardOfDirectors,
  execute: executeGetBoardOfDirectors,
  error: errorGetBoardOfDirectors
} = useGetBoardOfDirectors()
const {
  execute: executeSetBoardOfDirectorsContractAddress,
  isLoading: isLoadingSetBoardOfDirectorsContractAddress,
  isSuccess: isSuccessSetBoardOfDirectorsContractAddress,
  error: errorSetBoardOfDirectorsContractAddress
} = useSetBoardOfDirectorsContractAddress()
watch(isSuccessSetBoardOfDirectorsContractAddress, () => {
  if (isSuccessSetBoardOfDirectorsContractAddress.value) {
    addSuccessToast('Board of directors contract address set successfully')
    emits('getTeam')
  }
})
watch(errorSetBoardOfDirectorsContractAddress, () => {
  if (errorSetBoardOfDirectorsContractAddress.value) {
    addErrorToast(
      errorSetBoardOfDirectorsContractAddress.value.reason
        ? errorSetBoardOfDirectorsContractAddress.value.reason
        : 'Failed to set board of directors contract address'
    )
  }
})
watch(errorGetBoardOfDirectors, () => {
  if (errorGetBoardOfDirectors.value) {
    addErrorToast(
      errorGetBoardOfDirectors.value.reason
        ? errorGetBoardOfDirectors.value.reason
        : 'Failed to get board of directors'
    )
  }
})

const {
  execute: executeVotingContract,
  isLoading: loadingDeployVotingContract,
  isSuccess: isSuccessDeployVotingContract,
  error: errorDeployVotingContract
} = useDeployVotingContract()
const {
  execute: executeDeployBoDContract,
  isLoading: isLoadingBoDDeployment,
  isSuccess: isSuccessBoDDeployment,
  contractAddress: boardOfDirectorsAddress
} = useDeployBoDContract()
watch(isSuccessBoDDeployment, () => {
  if (isSuccessBoDDeployment.value) {
    executeSetBoardOfDirectorsContractAddress(
      String(props.team.votingAddress),
      String(boardOfDirectorsAddress.value)
    )
  }
})
watch(errorDeployVotingContract, () => {
  if (errorDeployVotingContract.value) {
    console.log(errorDeployVotingContract.value)
    addErrorToast(
      errorDeployVotingContract.value.reason
        ? errorDeployVotingContract.value.reason
        : 'Failed to deploy voting contract'
    )
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
watch(isSuccessDeployVotingContract, () => {
  if (isSuccessDeployVotingContract.value) {
    emits('getTeam')
  }
})
watch(errorDeployVotingContract, () => {
  if (errorDeployVotingContract.value) {
    console.log(errorDeployVotingContract.value)
    addErrorToast(
      errorDeployVotingContract.value.reason
        ? errorDeployVotingContract.value.reason
        : 'Failed to deploy voting contract'
    )
  }
})
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
const showBoDModal = ref(false)
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
  if (props.team.votingAddress) executeAddProposal(props.team.votingAddress, newProposalInput.value)
}
const oldProposals = ref<Partial<Proposal>[]>([])
const activeProposals = ref<Partial<Proposal>[]>([])

onMounted(() => {
  if (props.team.votingAddress) executeGetProposals(props.team.votingAddress)
})
</script>
