<template>
  <CardComponent title="Elections">
    <template #card-action>
      <div class="flex justify-between">
        <div class="flex justify-between gap-2">
          <UButton
            color="primary"
            size="md"
            @click="showModal = !showModal"
            data-test="create-proposal"
            label="Create Election"
          />
          <UButton
            color="secondary"
            size="md"
            v-if="boardOfDirectorsAddress"
            @click="
              () => {
                executeGetBoardOfDirectors()
                showBoDModal = true
              }
            "
            data-test="view-bod"
            label="View BoD"
          />
          <UButton
            color="secondary"
            size="md"
            @click="showVotingControlModal = true"
            data-test="manage-voting"
            label="Manage"
          />
        </div>
        <UModal v-model:open="showVotingControlModal">
          <template #body>
            <VotingManagement :team="team" />
          </template>
        </UModal>
      </div>
    </template>
    <div v-if="votingAddress">
      <div>
        <div class="flex flex-col" v-if="!loadingGetProposals" data-test="parent-div">
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
          <UModal v-model:open="showBoDModal">
            <template #body>
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
                      {{
                        team.members.find((member) => member.address === address)?.name || 'Unknown'
                      }}
                    </span>
                    {{ address }}
                  </li>
                </ul>
                <p v-else>No Board of Directors found.</p>
              </div>
            </template>
          </UModal>
          <UModal v-model:open="showModal">
            <template #body>
              <CreateElectionForm
                @createProposal="createProposal"
                :isLoading="loadingAddProposal || isConfirmingAddProposal"
              />
            </template>
          </UModal>
        </div>
      </div>
      <div class="flex justify-center items-center" v-if="loadingGetProposals">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    </div>
  </CardComponent>
</template>
<script setup lang="ts">
import type { OldProposal } from '@/types/index'
import { computed, onMounted, ref, watch, type Ref } from 'vue'
import CreateElectionForm from './forms/CreateElectionForm.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import { ProposalTabs } from '@/types/index'
import { readContract } from '@wagmi/core'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import type { Team } from '@/types/index'
import { useToastStore } from '@/stores/useToastStore'
import VotingManagement from '@/components/sections/AdministrationView/VotingManagement.vue'
import { useReadContract } from '@wagmi/vue'
import { BOD_ABI } from '@/artifacts/abi/bod'
import { VOTING_ABI } from '@/artifacts/abi/voting'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import CardComponent from '@/components/CardComponent.vue'

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
  abi: BOD_ABI
})

watch(errorGetBoardOfDirectors, () => {
  if (errorGetBoardOfDirectors.value) {
    addErrorToast('Failed to get board of directors')
  }
})

const {
  data: hashAddProposal,
  mutate: addProposal,
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
    const proposalCountResult = await readContract(config, {
      address: votingAddress.value,
      abi: VOTING_ABI,
      functionName: 'proposalCount'
    })
    const proposalCount = Number(proposalCountResult ?? 0n)
    const proposalsList: Partial<OldProposal>[] = []

    for (let i = 0; i < proposalCount; i++) {
      const proposal = (await readContract(config, {
        address: votingAddress.value,
        abi: VOTING_ABI,
        functionName: 'getProposalById',
        args: [BigInt(i)]
      })) as Partial<OldProposal>
      proposalsList.push(proposal)
    }

    activeProposals.value = proposalsList.filter(
      (proposal) => proposal.isActive
    ) as Partial<OldProposal>[]
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

const createProposal = (newProposalInput: Ref<Partial<OldProposal>>) => {
  newProposalInput.value.voters = props.team.members?.map((member) => {
    return {
      name: member.name,
      memberAddress: member.address
    }
  })
  if (votingAddress.value) {
    const proposal = newProposalInput.value
    const voters = (proposal.voters ?? []).map((voter) => voter.memberAddress) as Address[]
    const candidates = (proposal.candidates ?? []).map(
      (candidate) => candidate.candidateAddress
    ) as Address[]

    console.log('[createProposal] votingAddress.value: ', votingAddress.value)
    console.log('[createProposal] newProposalInput.value.voters: ', newProposalInput.value.voters)
    addProposal({
      address: votingAddress.value! as Address,
      abi: VOTING_ABI,
      functionName: 'addProposal',
      args: [
        proposal.title ?? '',
        proposal.description ?? '',
        proposal.isElection ?? false,
        proposal.winnerCount ?? 0,
        voters,
        candidates
      ]
    })
  }
}
const oldProposals = ref<Partial<OldProposal>[]>([])
const activeProposals = ref<Partial<OldProposal>[]>([])

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
