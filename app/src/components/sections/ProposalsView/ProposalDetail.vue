<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else-if="!proposal">No proposal found</div>
  <div v-else>
    <div class="flex flex-col shadow-md rounded-xl p-6 gap-8 bg-white">
      <div class="flex flex-row justify-between items-center">
        <div class="font-bold text-2xl">{{ proposal.title }}</div>
        <div
          :class="{
            'bg-purple-600': proposal.state == ProposalState.Active,
            'bg-green-500': proposal.state == ProposalState.Approved,
            'bg-red-500': proposal.state == ProposalState.Rejected,
            'bg-gray-300': proposal.state == ProposalState.Tied
          }"
          class="py-1 px-2 rounded-full"
        >
          {{
            proposal.state == ProposalState.Active
              ? 'Active'
              : proposal.state == ProposalState.Approved
                ? 'Approved'
                : proposal.state == ProposalState.Rejected
                  ? 'Rejected'
                  : 'Tied'
          }}
        </div>
      </div>
      <div class="grid grid-cols-4 grid-rows-1 gap-4">
        <!-- Created By -->
        <div class="col-span-1 row-span-1">
          <div class="text-sm text-gray-500 font-medium">Created By</div>
          <div class="flex flex-row items-center gap-2">
            <div class="text-lg font-semibold">
              {{
                teamStore.currentTeam?.members.find(
                  (member) => member.address === proposal?.creator
                )?.name || 'Unknown'
              }}
            </div>
            <div class="text-xs text-gray-400">BOD</div>
          </div>
        </div>

        <!-- Type -->
        <div class="col-span-1 row-span-1">
          <div class="text-sm text-gray-500 font-medium">Type</div>
          <div class="text-lg font-semibold">{{ proposal.proposalType }}</div>
        </div>

        <!-- Start Date -->
        <div class="col-span-1 row-span-1">
          <div class="text-sm text-gray-500 font-medium">Start Date</div>
          <div class="text-lg font-semibold">
            {{ formatDate(proposal.startDate) }}
          </div>
        </div>

        <!-- End Date -->
        <div class="col-span-1 row-span-1">
          <div class="text-sm text-gray-500 font-medium">End Date</div>
          <div class="text-lg font-semibold">
            {{ formatDate(proposal.endDate) }}
          </div>
        </div>
      </div>
      <div>{{ proposal.description }}</div>
      <div v-if="!hasVoted" class="flex flex-row justify-end gap-2">
        <ButtonUI variant="primary" @click="vote('yes')" :disabled="isVoting || isConfirmingVote"
          >Vote for yes</ButtonUI
        >
        <ButtonUI variant="error" @click="vote('no')" :disabled="isVoting || isConfirmingVote"
          >Vote for no</ButtonUI
        >
        <ButtonUI
          class="bg-gray-300"
          @click="vote('abstain')"
          :disabled="isVoting || isConfirmingVote"
          >Vote for abstain</ButtonUI
        >
      </div>
      <div class="flex flex-col">
        <div class="text-lg font-semibold mb-4">Current Results</div>
        <div class="flex flex-row justify-between gap-6">
          <div class="bg-gray-100 rounded-lg w-full p-6 flex flex-col gap-4">
            <div class="flex flex-row justify-between items-center">
              <div class="font-bold text-gray-600">Total Votes</div>
              <div class="font-bold text-xl">
                {{ proposal.voteCount }}/{{ proposal.totalVoters }}
              </div>
            </div>

            <!-- Voting Progress Bars -->
            <div class="flex flex-col gap-3">
              <!-- For Votes -->
              <div class="flex flex-col">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-green-600 font-medium">For</span>
                  <span class="text-green-600 font-bold"
                    >{{ proposal.yesCount }} ({{ calculateVotePercentage('yes') }}%)</span
                  >
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-green-500 h-2 rounded-full"
                    :style="{ width: calculateVotePercentage('yes') + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Against Votes -->
              <div class="flex flex-col">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-red-600 font-medium">Against</span>
                  <span class="text-red-600 font-bold"
                    >{{ proposal.noCount }} ({{ calculateVotePercentage('no') }}%)</span
                  >
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-red-500 h-2 rounded-full"
                    :style="{ width: calculateVotePercentage('no') + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-100 rounded-lg w-full p-6 flex flex-col gap-4">
            <div class="font-bold text-gray-600">Recent Votes</div>
            <div class="flex flex-col gap-3">
              <!-- Recent Vote Items -->
              <div
                v-for="vote in recentVotes"
                :key="vote.voter"
                class="flex justify-between items-center"
              >
                <span class="font-medium">{{
                  teamStore.currentTeam?.members.find((member) => member.address === vote.voter)
                    ?.name || 'Unknown'
                }}</span>
                <div class="flex items-center gap-2">
                  <span
                    :class="
                      vote.vote === 'yes'
                        ? 'text-green-600'
                        : vote.vote === 'no'
                          ? 'text-red-600'
                          : 'text-gray-600'
                    "
                    class="font-medium"
                    >{{ vote.vote === 'yes' ? 'For' : vote.vote === 'no' ? 'Against' : 'Abstain' }}</span
                  >
                  <span class="text-gray-500 text-sm">{{ vote.timestamp }}</span>
                </div>
              </div>
              <!-- Show message if no votes -->
              <div v-if="recentVotes.length === 0" class="text-gray-500 text-sm text-center py-4">
                No recent votes to display
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
import ButtonUI from '@/components/ButtonUI.vue'
import { useTeamStore, useToastStore, useUserDataStore } from '@/stores'
import { ProposalState, type ProposalVoteEvent } from '@/types'
import { config } from '@/wagmi.config'
import { useQueryClient } from '@tanstack/vue-query'
import { useReadContract, useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { parseAbiItem, type Address } from 'viem'
import { createEventFilter, getFilterLogs } from 'viem/actions'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const client = config.getClient()
const route = useRoute()
const teamStore = useTeamStore()
const emits = defineEmits(['proposal-voted'])
const proposalsAddress = computed(() => teamStore.getContractAddressByType('Proposals') as Address)
const toastStore = useToastStore()
const userDataStore = useUserDataStore()

// Helper function to format dates
const formatDate = (timestamp: bigint | number | undefined) => {
  if (!timestamp) return ''
  const date = new Date(Number(timestamp) * 1000) // Assuming timestamp is in seconds
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Helper function to calculate vote percentages
const calculateVotePercentage = (voteType: 'yes' | 'no' | 'abstain') => {
  if (!proposal.value) return 0

  const totalVotes =
    Number(proposal.value.yesCount) +
    Number(proposal.value.noCount) +
    Number(proposal.value.abstainCount)
  if (totalVotes === 0) return 0

  let votes = 0
  switch (voteType) {
    case 'yes':
      votes = Number(proposal.value.yesCount)
      break
    case 'no':
      votes = Number(proposal.value.noCount)
      break
    case 'abstain':
      votes = Number(proposal.value.abstainCount)
      break
  }

  return Math.round((votes / totalVotes) * 100)
}
const recentVotes = ref<ProposalVoteEvent[]>([])
const queryClient = useQueryClient()

const {
  data: proposal,
  error,
  isLoading,
  queryKey: proposalQueryKey
} = useReadContract({
  address: proposalsAddress.value! as Address,
  abi: PROPOSALS_ABI,
  functionName: 'getProposal',
  args: [BigInt(route.params.proposalId as string)],
  scopeKey: 'proposalDetail'
})

const {
  writeContract: voteOnProposal,
  isPending: isVoting,
  error: voteError,
  data: txHash
} = useWriteContract()

const {
  isLoading: isConfirmingVote,
  isSuccess: isVoteConfirmed,
  error: errorConfirmingVote
} = useWaitForTransactionReceipt({
  hash: txHash
})

const { data: hasVoted, queryKey: hasVotedQueryKey } = useReadContract({
  address: proposalsAddress.value! as Address,
  abi: PROPOSALS_ABI,
  functionName: 'hasVoted',
  args: [BigInt(route.params.proposalId as string), userDataStore.address as Address],
  scopeKey: 'hasVoted'
})

const vote = async (voteType: 'yes' | 'no' | 'abstain') => {
  if (!proposal.value) return

  const voteValue = voteType === 'yes' ? 0 : voteType === 'no' ? 2 : 1 // Assuming 0 for yes, 2 for no, and 1 for abstain

  try {
    voteOnProposal({
      address: proposalsAddress.value! as Address,
      abi: PROPOSALS_ABI,
      functionName: 'castVote',
      args: [BigInt(route.params.proposalId as string), voteValue]
    })
  } catch (err) {
    console.error('Error voting on proposal:', err)
  }
}

onMounted(async () => {
  const filter = await createEventFilter(client, {
    address: proposalsAddress.value,
    event: parseAbiItem(
      'event ProposalVoted(uint256 indexed proposalId, address indexed voter, uint8 vote, uint256 timestamp)'
    ),
    args: {
      proposalId: BigInt(route.params.proposalId as string)
    }
  })
  const events = await getFilterLogs(client, { filter })

  recentVotes.value = events.map(
    (event) =>
      ({
        proposalId: event.args.proposalId,
        voter: event.args.voter,
        vote:
          Number(event.args.vote) === 0 ? 'yes' : Number(event.args.vote) === 2 ? 'no' : 'abstain',
        timestamp: formatDate(event.args.timestamp)
      }) as ProposalVoteEvent
  )
})

watch(voteError, (error) => {
  if (error) {
    console.error('Error voting on proposal:', error)
    toastStore.addErrorToast('Failed to cast vote')
  }
})

watch(errorConfirmingVote, (error) => {
  if (error) {
    console.error('Error confirming vote:', error)
    toastStore.addErrorToast('Failed to confirm vote')
  }
})

watch(isVoteConfirmed, async (success) => {
  if (success) {
    emits('proposal-voted')
    await queryClient.invalidateQueries({ queryKey: [proposalQueryKey, hasVotedQueryKey] })
    toastStore.addSuccessToast('Vote cast successfully!')
  }
})
</script>
