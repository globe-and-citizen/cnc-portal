import { VotingService } from '@/services/votingService'
import type { Proposal } from '@/types'
import { ref } from 'vue'

const votingService = new VotingService()

export function useAddProposal() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function addProposal(proposal: Partial<Proposal>) {
    try {
      loading.value = true
      proposal.votes = {
        yes: 0,
        no: 0,
        abstain: 0
      }
      proposal.isActive = true
      proposal.voters?.map((voter) => {
        voter.isVoted = false
        voter.isEligible = true
      })

      transaction.value = await votingService.addProposal(proposal)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: addProposal, isLoading: loading, isSuccess, error, transaction }
}

export function useGetProposals() {
  const proposals = ref<any[]>([])
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function getProposals() {
    try {
      loading.value = true
      proposals.value = await votingService.getProposals()
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getProposals, isLoading: loading, error, data: proposals, isSuccess }
}
export function useConcludeProposal() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function concludeProposal(proposalId: number) {
    try {
      loading.value = true
      transaction.value = await votingService.concludeProposal(proposalId)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: concludeProposal, isLoading: loading, isSuccess, error, transaction }
}
export function useVoteDirective() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function voteDirective(proposalId: number, directive: number) {
    try {
      loading.value = true
      transaction.value = await votingService.voteDirective(proposalId, directive)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: voteDirective, isLoading: loading, isSuccess, error, transaction }
}
export function useVoteElection() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function voteElection(electionId: number, candidateAddress: string) {
    try {
      loading.value = true
      transaction.value = await votingService.voteElection(electionId, candidateAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: voteElection, isLoading: loading, isSuccess, error, transaction }
}
