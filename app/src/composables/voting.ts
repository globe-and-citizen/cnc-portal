import { VotingService } from '@/services/votingService'
import { ref } from 'vue'

const votingService = new VotingService()

export function useCreateVotingContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function deploy() {
    try {
      loading.value = true
      console.log('createVotingContract')
      contractAddress.value = await votingService.createVotingContract()
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

  async function addProposal(votingAddress: string, proposal: any) {
    try {
      loading.value = true
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
