<template>
  <div v-if="votingAddress">
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
            <ButtonUI
              variant="primary"
              size="md"
              @click="showModal = !showModal"
              data-test="create-proposal"
            >
              Create Proposal
            </ButtonUI>
            <ButtonUI
              variant="secondary"
              size="md"
              v-if="boardOfDirectorsAddress"
              @click="
                () => {
                  executeGetBoardOfDirectors()
                  showBoDModal = true
                }
              "
              data-test="view-bod"
            >
              View BoD
            </ButtonUI>
            <ButtonUI
              variant="secondary"
              size="md"
              @click="showVotingControlModal = true"
              data-test="manage-voting"
            >
              Manage
            </ButtonUI>
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
            <ul v-if="(boardOfDirectors as Array<string>)?.length">
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
            :team="team"
            v-model="newProposalInput"
            @createProposal="createProposal"
            :isLoading="loadingAddProposal || isConfirmingAddProposal"
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
import ProposalCard from '@/components/sections/AdministrationView/ProposalCard.vue'
import type { Proposal } from '@/types/index'
import { computed, onMounted, ref, watch } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import CreateProposalForm from '@/components/sections/AdministrationView/forms/CreateProposalForm.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import { ProposalTabs } from '@/types/index'
import { readContract } from '@wagmi/core'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import type { Team } from '@/types/index'
import { useRoute } from 'vue-router'
import { useToastStore } from '@/stores/useToastStore'
import VotingManagement from '@/components/sections/AdministrationView/VotingManagement.vue'
import { useReadContract } from '@wagmi/vue'
import BoDABI from '@/artifacts/abi/bod.json'
import VotingABI from '@/artifacts/abi/voting.json'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import ButtonUI from '@/components/ButtonUI.vue'

const props = defineProps<{ team: Partial<Team> }>()
const showVotingControlModal = ref(false)
const emits = defineEmits(['getTeam', 'addBodTab'])
const { addSuccessToast, addErrorToast } = useToastStore()

const votingAddress = computed(() => {
  const address = props.team.teamContracts?.find((contract) => contract.type === 'Voting')?.address
  return address as Address
})

const boardOfDirectorsAddress = computed(() => {
  const address = props.team.teamContracts?.find(
    (contract) => contract.type === 'BoardOfDirectors'
  )?.address
  return address as Address
})
const {
  data: boardOfDirectors,
  refetch: executeGetBoardOfDirectors,
  error: errorGetBoardOfDirectors
} = useReadContract({
  functionName: 'getBoardOfDirectors',
  address: boardOfDirectorsAddress.value,
  abi: BoDABI
})

watch(errorGetBoardOfDirectors, () => {
  if (errorGetBoardOfDirectors.value) {
    addErrorToast('Failed to get board of directors')
  }
})

const {
  data: hashAddProposal,
  writeContract: addProposal,
  isPending: loadingAddProposal,
  error: errorAddProposal
} = useWriteContract()

const { isLoading: isConfirmingAddProposal, isSuccess: isConfirmedAddProposal } =
  useWaitForTransactionReceipt({
    hash: hashAddProposal
  })
const loadingGetProposals = ref(false)

const fetchProposals = async () => {
  try {
    loadingGetProposals.value = true
    const proposalCount = (await readContract(config, {
      address: votingAddress.value,
      abi: VotingABI,
      functionName: 'proposalCount'
    })) as number
    const proposalsList = []
    for (let i = 0; i < proposalCount; i++) {
      const proposal = await readContract(config, {
        address: votingAddress.value,
        abi: VotingABI,
        functionName: 'getProposalById',
        args: [i]
      })
      proposalsList.push(proposal as Partial<Proposal>)
    }

    activeProposals.value = proposalsList.filter(
      (proposal) => proposal.isActive
    ) as Partial<Proposal>[]
    oldProposals.value = proposalsList.filter((proposal) => !proposal.isActive)
  } catch (error) {
    if (error instanceof Error) {
      console.log(error.message)
    } else {
      console.log('There is an error')
    }
    addErrorToast('Failed to get proposals')
  } finally {
    loadingGetProposals.value = false
  }
}

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
  if (votingAddress.value) {
    console.log('[createProposal] votingAddress.value: ', votingAddress.value)
    console.log('[createProposal] newProposalInput.value.voters: ', newProposalInput.value.voters)
    addProposal({
      address: votingAddress.value! as Address,
      abi: VotingABI,
      functionName: 'addProposal',
      args: [
        newProposalInput.value.title,
        newProposalInput.value.description,
        newProposalInput.value.isElection,
        newProposalInput.value.winnerCount,
        newProposalInput.value.voters!.map((voter) => voter.memberAddress) as Address[],
        newProposalInput.value.candidates!.map(
          (candidate) => candidate.candidateAddress
        ) as Address[]
      ]
    })
  }
}
const oldProposals = ref<Partial<Proposal>[]>([])
const activeProposals = ref<Partial<Proposal>[]>([])

watch(isConfirmingAddProposal, (isConfirming, wasConfirming) => {
  if (wasConfirming && !isConfirming && isConfirmedAddProposal.value) {
    addSuccessToast('Proposal created successfully')
    fetchProposals()
    showModal.value = false
  }
})

onMounted(() => {
  if (votingAddress.value) fetchProposals()
})
</script>
