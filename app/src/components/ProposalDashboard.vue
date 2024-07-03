<template>
  <div class="flex justify-center" v-if="!team.votingAddress">
    <button
      class="btn btn-primary btn-md"
      @click="executeCreateVotingContract(String($route.params.id))"
      v-if="!loading"
    >
      Deploy contract
    </button>
    <div v-else>
      <LoadingButton color="primary min-w-28" />
    </div>
  </div>
  <div class="flex flex-col" v-else>
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
</template>
<script setup lang="ts">
import ProposalCard from '@/components/ProposalCard.vue'
import type { Proposal } from '@/types/index'
import { ref, watch } from 'vue'
import ModalComponent from './ModalComponent.vue'
import CreateProposalForm from './forms/CreateProposalForm.vue'
import TabNavigation from './TabNavigation.vue'
import { ProposalTabs } from '@/types/index'
import { useCreateVotingContract, useAddProposal } from '@/composables/voting'
import type { Team } from '@/types/index'
import LoadingButton from './LoadingButton.vue'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'

const emits = defineEmits(['getTeam'])
const { addSuccessToast, addErrorToast } = useToastStore()
const {
  execute: executeCreateVotingContract,
  isLoading: loading,
  isSuccess,
  error,
  contractAddress
} = useCreateVotingContract()
const {
  execute: executeAddProposal,
  isLoading: loadingAddProposal,
  isSuccess: isSuccessAddProposal,
  error: errorAddProposal
} = useAddProposal()
watch(isSuccessAddProposal, () => {
  if (isSuccessAddProposal.value) {
    console.log(isSuccessAddProposal.value)
    addSuccessToast('Proposal created successfully')
  }
})
watch(errorAddProposal, () => {
  if (errorAddProposal.value) {
    addErrorToast(
      errorAddProposal.value.reason ? errorAddProposal.value.reason : 'Failed to create proposal'
    )
  }
})
watch(isSuccess, () => {
  if (isSuccess.value) {
    addSuccessToast('Voting contract deployed successfully')
    emits('getTeam')
  }
})

watch(error, () => {
  if (error.value) {
    addErrorToast(error.value.reason ? error.value.reason : 'Failed to deploy contract')
  }
})
const showModal = ref(false)
const tabs = ref([ProposalTabs.Ongoing, ProposalTabs.Done])

const props = defineProps<{ team: Partial<Team> }>()
const newProposalInput = ref<Partial<Proposal>>({
  title: '',
  description: '',
  draftedBy: '',
  isElection: false,
  voters: [],
  candidates: []
})

const createProposal = () => {
  newProposalInput.value.draftedBy = useUserDataStore().name
  newProposalInput.value.voters = props.team.members?.map((member) => {
    return {
      name: member.name,
      memberAddress: member.address
    }
  })

  if (props.team.votingAddress) {
    executeAddProposal(props.team.votingAddress, newProposalInput.value)
  }
}
const oldProposals = ref<Partial<Proposal>[]>([
  {
    title: 'Remote work: Yay or Nay?',
    description: 'What is the best way to work? Remote or Office?',
    draftedBy: 'Dasarath',
    votes: {
      yes: 10,
      no: 2,
      abstain: 1
    },
    isElection: false,
    voters: [
      {
        name: 'Dasarath',
        memberAddress: '0x1234567890'
      },
      {
        name: 'Ravioli',
        memberAddress: '0x111234567890'
      },
      {
        name: 'Herm',
        memberAddress: '0x123114567890'
      }
    ]
  }
])
const activeProposals = ref<Partial<Proposal>[]>([
  {
    title: 'Board of Directors Election this June',
    description:
      'The Crypto Native Portal, an app that creates a mechanism to financially acknowledge the micro contributions of Open Source collaborators along with tools that promote effective governance.',
    draftedBy: 'Ravioli',
    candidates: [
      {
        name: 'Dasarath',
        votes: 2,
        address: '0x1234567890'
      },
      {
        name: 'Ravioli',
        votes: 2,
        address: '0x111234567890'
      },
      {
        name: 'Herm',
        votes: 2,
        address: '0x123114567890'
      }
    ],
    isElection: true
  },
  {
    title: 'Remote work: Yay or Nay?',
    description: 'What is the best way to work? Remote or Office?',
    draftedBy: 'Dasarath',
    votes: {
      yes: 10,
      no: 2,
      abstain: 1
    },
    isElection: false
  }
])
</script>
