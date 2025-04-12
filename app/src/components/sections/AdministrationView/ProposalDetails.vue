<template>
  <div>
    <h2>{{ proposal.title }}</h2>

    <span class="text-sm"> {{ proposal.description }}</span>

    <hr />

    <div class="h-40" v-if="!proposal.isElection">
      <PieChart :data="chartData" title="Directive" />
    </div>
    <div class="h-40" v-else>
      <PieChart :data="chartData" title="Election" />
    </div>

    <!-- Tie Resolution Section -->
    <div v-if="proposal.hasTie && proposal.isElection" class="mt-4">
      <h3 class="text-lg font-bold">Tie Detected</h3>
      <p class="text-sm mt-2">The following candidates are tied:</p>
      <ul class="list-disc list-inside mt-2">
        <li v-for="address in proposal.tiedCandidates" :key="address">
          {{ team.members.find((m: Member) => m.address === address)?.name || 'Unknown' }} ({{
            address
          }})
        </li>
      </ul>

      <div
        v-if="proposal.draftedBy === userAddress && !proposal.selectedTieBreakOption"
        class="mt-4"
      >
        <h4 class="font-bold">Select Tie Break Option:</h4>
        <div class="flex flex-col gap-2 mt-2">
          <ButtonUI
            :loading="
              (isConfirmingResolveTie || isLoadingSelectWinner || isLoadingResolveTie) &&
              selectedTieBreakOption == TieBreakOption.RANDOM_SELECTION
            "
            :disabled="
              (isLoadingSelectWinner || isLoadingResolveTie || isConfirmingResolveTie) &&
              selectedTieBreakOption == TieBreakOption.RANDOM_SELECTION
            "
            class="btn btn-primary btn-sm"
            @click="resolveTie(TieBreakOption.RANDOM_SELECTION)"
            data-test="random-selection-btn"
          >
            Random Selection
          </ButtonUI>
          <ButtonUI
            :loading="
              (isConfirmingResolveTie || isLoadingSelectWinner || isLoadingResolveTie) &&
              selectedTieBreakOption == TieBreakOption.RUNOFF_ELECTION
            "
            :disabled="
              (isLoadingSelectWinner || isLoadingResolveTie || isConfirmingResolveTie) &&
              selectedTieBreakOption == TieBreakOption.RUNOFF_ELECTION
            "
            class="btn btn-primary btn-sm"
            @click="resolveTie(TieBreakOption.RUNOFF_ELECTION)"
            data-test="runoff-election-btn"
          >
            Runoff Election
          </ButtonUI>
          <ButtonUI
            :loading="
              (isConfirmingResolveTie || isLoadingSelectWinner || isLoadingResolveTie) &&
              selectedTieBreakOption == TieBreakOption.FOUNDER_CHOICE
            "
            :disabled="
              (isLoadingSelectWinner || isLoadingResolveTie || isConfirmingResolveTie) &&
              selectedTieBreakOption == TieBreakOption.FOUNDER_CHOICE
            "
            class="btn btn-primary btn-sm"
            @click="resolveTie(TieBreakOption.FOUNDER_CHOICE)"
            data-test="founder-choice-btn"
          >
            Choose Winner
          </ButtonUI>
          <ButtonUI
            :loading="
              (isConfirmingResolveTie || isLoadingResolveTie || isLoadingSelectWinner) &&
              selectedTieBreakOption == TieBreakOption.INCREASE_WINNER_COUNT
            "
            :disabled="
              (isLoadingSelectWinner || isLoadingResolveTie || isConfirmingResolveTie) &&
              selectedTieBreakOption == TieBreakOption.INCREASE_WINNER_COUNT
            "
            class="btn btn-primary btn-sm"
            @click="resolveTie(TieBreakOption.INCREASE_WINNER_COUNT)"
            data-test="increase-winner-btn"
          >
            Increase Winner Count
          </ButtonUI>
        </div>
      </div>

      <!-- Founder Choice Selection -->
      <div
        v-if="
          proposal.selectedTieBreakOption === TieBreakOption.FOUNDER_CHOICE &&
          proposal.draftedBy === userAddress
        "
        class="mt-4"
      >
        <h4 class="font-bold">Select Winner:</h4>
        <div class="flex flex-col gap-2 mt-2">
          <ButtonUI
            v-for="address in proposal.tiedCandidates"
            :key="address"
            class="btn btn-secondary btn-sm"
            @click="selectWinner(address)"
            :loading="isLoadingSelectWinner || isConfirmingSelectWinner"
            :disabled="isLoadingSelectWinner || isConfirmingSelectWinner"
            data-test="select-winner-btn"
          >
            {{ team.members.find((m: Member) => m.address === address)?.name || 'Unknown' }}
          </ButtonUI>
        </div>
      </div>

      <div v-if="selectedTieBreakOption != undefined" class="mt-4">
        <p class="text-sm">
          Selected tie break option:
          <span class="font-bold">
            {{ tieBreakOptionLabels[selectedTieBreakOption as keyof typeof tieBreakOptionLabels] }}
          </span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, ref, watch } from 'vue'
import PieChart from '@/components/PieChart.vue'
import type { Member, Proposal } from '@/types'
import { TieBreakOption } from '@/types'
import { useWaitForTransactionReceipt, useWriteContract } from '@wagmi/vue'
import { useToastStore } from '@/stores/useToastStore'
import { useUserDataStore } from '@/stores/user'
import VotingABI from '@/artifacts/abi/voting.json'
import type { Address } from 'viem'
import ButtonUI from '@/components/ButtonUI.vue'

const props = defineProps(['proposal', 'team'])
const emits = defineEmits(['getTeam'])
const { addSuccessToast, addErrorToast } = useToastStore()
const userAddress = useUserDataStore().address

const tieBreakOptionLabels: Record<TieBreakOption, string> = {
  [TieBreakOption.RANDOM_SELECTION]: 'Random Selection',
  [TieBreakOption.RUNOFF_ELECTION]: 'Runoff Election',
  [TieBreakOption.FOUNDER_CHOICE]: 'Founder Choice',
  [TieBreakOption.INCREASE_WINNER_COUNT]: 'Increase Winner Count'
}

const selectedTieBreakOption = ref<TieBreakOption | undefined>(undefined)

const chartData = computed(() => {
  const votes = props.proposal.votes || {}
  if (props.proposal.isElection) {
    interface Candidate {
      votes?: number
      name: string
      candidateAddress: string
    }
    return (props.proposal as Partial<Proposal>)?.candidates?.map((candidate: Candidate) => {
      const member = props.team.members.find(
        (member: Member) => member.address === candidate.candidateAddress
      )
      return {
        value: Number(candidate.votes) || 0,
        name: member ? member.name : 'Unknown'
      }
    })
  } else {
    return [
      { value: Number(votes.yes) || 0, name: 'Yes' },
      { value: Number(votes.no) || 0, name: 'No' },
      { value: Number(votes.abstain) || 0, name: 'Abstain' }
    ]
  }
})

// Tie Resolution
const {
  writeContract: resolveTieContract,
  error: resolveTieError,
  data: hashResolveTie,
  isPending: isLoadingResolveTie
} = useWriteContract()

const { isLoading: isConfirmingResolveTie, isSuccess: isConfirmedResolveTie } =
  useWaitForTransactionReceipt({
    hash: hashResolveTie
  })

const {
  writeContract: selectWinnerContract,
  error: selectWinnerError,
  data: hashSelectWinner,
  isPending: isLoadingSelectWinner
} = useWriteContract()

const { isLoading: isConfirmingSelectWinner, isSuccess: isConfirmedSelectWinner } =
  useWaitForTransactionReceipt({
    hash: hashSelectWinner
  })

const resolveTie = (option: TieBreakOption) => {
  selectedTieBreakOption.value = option
  if (props.team.votingAddress) {
    resolveTieContract({
      address: props.team.votingAddress as Address,
      abi: VotingABI,
      functionName: 'resolveTie',
      args: [Number(props.proposal.id), option]
    })
  }
}

const selectWinner = (winner: string) => {
  if (props.team.votingAddress) {
    selectWinnerContract({
      address: props.team.votingAddress as Address,
      abi: VotingABI,
      functionName: 'selectWinner',
      args: [Number(props.proposal.id), winner as Address]
    })
  }
}

// Watch for transaction confirmations
watch(isConfirmingResolveTie, (isConfirming: boolean, wasConfirming: boolean) => {
  if (wasConfirming && !isConfirming && isConfirmedResolveTie.value) {
    addSuccessToast('Tie break option selected successfully')
  }
})

watch(isConfirmingSelectWinner, (isConfirming: boolean, wasConfirming: boolean) => {
  if (wasConfirming && !isConfirming && isConfirmedSelectWinner.value) {
    addSuccessToast('Winner selected successfully')
    emits('getTeam')
  }
})

// Watch for errors
watch(resolveTieError, () => {
  if (resolveTieError.value) {
    addErrorToast('Error selecting tie break option')
    selectedTieBreakOption.value = undefined
  }
})

watch(selectWinnerError, () => {
  if (selectWinnerError.value) {
    addErrorToast('Error selecting winner')
    selectedTieBreakOption.value = undefined
  }
})
</script>
