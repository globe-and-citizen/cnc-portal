<template>
  <div class="flex flex-col">
    <div class="flex justify-between">
      <h2>Proposals</h2>
      <button class="btn btn-primary btn-md" @click="showModal = !showModal">
        Create Proposal
      </button>
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
      <CreateProposalForm />
    </ModalComponent>
  </div>
</template>
<script setup lang="ts">
import ProposalCard from '@/components/ProposalCard.vue'
import type { Proposal } from '@/types/index'
import { ref } from 'vue'
import ModalComponent from './ModalComponent.vue'
import CreateProposalForm from './forms/CreateProposalForm.vue'
import TabNavigation from './TabNavigation.vue'
import { ProposalTabs } from '@/types/index'
const showModal = ref(false)
const tabs = ref([ProposalTabs.Ongoing, ProposalTabs.Done])
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
    isElection: false
  }
])
const activeProposals = ref<Partial<Proposal>[]>([
  {
    title: 'Board of Directors Election this June',
    description:
      'The Crypto Native Portal, an app that creates a mechanism to financially acknowledge the micro contributions of Open Source collaborators along with tools that promote effective governance.',
    draftedBy: 'Ravioli',
    votesForUsers: [
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
