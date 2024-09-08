import { VotingService } from '@/services/votingService'
import type { Proposal } from '@/types'
import { ref } from 'vue'

const votingService = new VotingService()

export function useAddProposal() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function addProposal(votingAddress: string, proposal: Partial<Proposal>) {
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
      if (proposal.isElection) {
        proposal.candidates?.map((candidate) => {
          candidate.votes = 0
        })
      }

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
  const proposals = ref<Partial<Proposal>[]>([])
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function getProposals(votingAddress: string) {
    try {
      loading.value = true
      proposals.value = await votingService.getProposals(votingAddress)
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

  async function concludeProposal(votingAddress: string, proposalId: Number) {
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

  async function voteDirective(votingAddress: string, proposalId: Number, directive: number) {
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

  async function voteElection(votingAddress: string, proposalId: Number, candidateAddress: string) {
    try {
      loading.value = true
      transaction.value = await votingService.voteElection(
        votingAddress,
        proposalId,
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
export function useSetBoardOfDirectorsContractAddress() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function setBoardOfDirectorsContractAddress(votingAddress: string, bodAddress: string) {
    try {
      loading.value = true
      transaction.value = await votingService.setBoardOfDirectorsContractAddress(
        votingAddress,
        bodAddress
      )
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return {
    execute: setBoardOfDirectorsContractAddress,
    isLoading: loading,
    isSuccess,
    error,
    transaction
  }
}
export function useDeployVotingContract() {
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
