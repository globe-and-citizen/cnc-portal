import { VotingService } from '@/services/votingService'
import type { Proposal } from '@/types'
import { ref } from 'vue'

const votingService = new VotingService()

export function useCreateVotingContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function deploy(teamId: string) {
    try {
      loading.value = true
      contractAddress.value = await votingService.createVotingContract(teamId)
      console.log('contractAddress', contractAddress.value)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deploy, isLoading: loading, isSuccess, error, contractAddress }
}

export function useAddProposal() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function addProposal(votingAddress: string, proposal: Partial<Proposal>) {
    try {
      loading.value = true
      console.log('proposal', proposal)
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

      transaction.value = await votingService.addProposal(votingAddress, proposal)
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

  async function getProposals(votingAddress: string) {
    try {
      loading.value = true
      proposals.value = await votingService.getProposals(votingAddress)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getProposals, isLoading: loading, error, data: proposals }
}
export function useConcludeProposal() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function concludeProposal(votingAddress: string, proposalId: number) {
    try {
      loading.value = true
      transaction.value = await votingService.concludeProposal(votingAddress, proposalId)
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

  async function voteDirective(votingAddress: string, proposalId: number, directive: number) {
    try {
      loading.value = true
      transaction.value = await votingService.voteDirective(votingAddress, proposalId, directive)
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

  async function voteElection(votingAddress: string, electionId: number, candidateAddress: string) {
    try {
      loading.value = true
      transaction.value = await votingService.voteElection(
        votingAddress,
        electionId,
        candidateAddress
      )
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: voteElection, isLoading: loading, isSuccess, error, transaction }
}
