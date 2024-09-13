import { VotingService } from '@/services/votingService'
import type { Proposal } from '@/types'
import type { TransactionResponse } from 'ethers'
import type { ContractTransaction } from 'ethers'
import { ref } from 'vue'

const votingService = new VotingService()

export function useAddProposal() {
  const transaction = ref<ContractTransaction>()
  const loading = ref(false)
  const error = ref<unknown>(null)
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
  const error = ref<unknown>(null)
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
  const transaction = ref<ContractTransaction>()
  const loading = ref(false)
  const error = ref<unknown>(null)
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
  const transaction = ref<ContractTransaction>()
  const loading = ref(false)
  const error = ref<unknown>(null)
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
  const transaction = ref<ContractTransaction>()
  const loading = ref(false)
  const error = ref<unknown>(null)
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
  const transaction = ref<ContractTransaction>()
  const loading = ref(false)
  const error = ref<unknown>(null)
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
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function deploy(teamId: string) {
    try {
      loading.value = true
      contractAddress.value = await votingService.createVotingContract(teamId)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deploy, isLoading: loading, isSuccess, error, contractAddress }
}
export function useVotingContractStatus(votingAddress: string) {
  const isPaused = ref<boolean | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<unknown>(null)

  async function getIsPaused(): Promise<void> {
    try {
      loading.value = true
      isPaused.value = await votingService.isPaused(votingAddress)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { data: isPaused, execute: getIsPaused, isLoading: loading, error }
}

export function useVotingContractOwner(votingAddress: string) {
  const owner = ref<string | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<unknown>(null)

  async function getOwner(): Promise<void> {
    try {
      loading.value = true
      owner.value = await votingService.getOwner(votingAddress)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { data: owner, execute: getOwner, isLoading: loading, error }
}

export function useVotingContractPause(votingAddress: string) {
  const transaction = ref<TransactionResponse | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function pause(): Promise<void> {
    try {
      loading.value = true
      transaction.value = await votingService.pause(votingAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: pause, isLoading: loading, isSuccess, error, transaction }
}

export function useVotingContractUnpause(votingAddress: string) {
  const transaction = ref<TransactionResponse | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function unpause(): Promise<void> {
    try {
      loading.value = true
      transaction.value = await votingService.unpause(votingAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: unpause, isLoading: loading, isSuccess, error, transaction }
}

export function useVotingContractTransferOwnership(votingAddress: string) {
  const transaction = ref<TransactionResponse | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function transferOwnership(newOwner: string): Promise<void> {
    try {
      loading.value = true
      transaction.value = await votingService.transferOwnership(votingAddress, newOwner)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: transferOwnership, isLoading: loading, isSuccess, error, transaction }
}
