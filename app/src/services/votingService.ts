import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'

import VOTING_ABI from '@/artifacts/abi/voting.json'
import type { Contract } from 'ethers'
import type { Proposal } from '@/types'
import { SmartContract } from './contractService'
import type { ContractTransaction } from 'ethers'
import type { TransactionResponse } from 'ethers'

export interface IVotingService {
  web3Library: IWeb3Library
  addProposal(votingAddress: string, proposal: Partial<Proposal>): Promise<ContractTransaction>
  getProposals(votingAddress: string): Promise<Array<Partial<Proposal>>>
  concludeProposal(votingAddress: string, proposalId: Number): Promise<ContractTransaction>
  voteDirective(
    votingAddress: string,
    proposalId: Number,
    directive: Number
  ): Promise<ContractTransaction>
  voteElection(
    votingAddress: string,
    proposalId: Number,
    candidateAddress: string
  ): Promise<ContractTransaction>
  pause(votingAddress: string): Promise<TransactionResponse>
  unpause(votingAddress: string): Promise<TransactionResponse>
  transferOwnership(votingAddress: string, newOwner: string): Promise<TransactionResponse>
  isPaused(votingAddress: string): Promise<boolean>
  getOwner(votingAddress: string): Promise<string>
}

export class VotingService implements IVotingService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async addProposal(
    votingAddress: string,
    proposal: Partial<Proposal>
  ): Promise<ContractTransaction> {
    proposal.id = 0
    const votingContract = await this.getVotingContract(votingAddress)
    const voters = proposal.voters?.map((voter) => voter.memberAddress)
    const candidates = proposal.candidates?.map((candidate) => candidate.candidateAddress)
    const tx = await votingContract.addProposal(
      proposal.title,
      proposal.description,
      proposal.isElection,
      proposal.winnerCount,
      voters,
      candidates
    )
    await tx.wait()

    return tx
  }
  async getProposals(votingAddress: string): Promise<Array<Partial<Proposal>>> {
    const votingContract = await this.getVotingContract(votingAddress)
    const proposalCount = await votingContract.proposalCount()
    const proposals = []
    if (proposalCount === 0) {
      return []
    }
    for (let i = 0; i < proposalCount; i++) {
      proposals.push(await votingContract.getProposalById(i))
    }
    return proposals
  }
  async concludeProposal(votingAddress: string, proposalId: Number): Promise<ContractTransaction> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.concludeProposal(proposalId)
    await tx.wait()

    return tx
  }
  async setBoardOfDirectorsContractAddress(votingAddress: string, bodAddress: string) {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.setBoardOfDirectorsContractAddress(bodAddress)
    await tx.wait()

    return tx
  }
  async voteDirective(
    votingAddress: string,
    proposalId: Number,
    vote: Number
  ): Promise<ContractTransaction> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.voteDirective(proposalId, vote)
    await tx.wait()

    return tx
  }
  async voteElection(
    votingAddress: string,
    proposalId: Number,
    candidateAddress: string
  ): Promise<ContractTransaction> {
    const votingContract = await this.getVotingContract(votingAddress)
    const tx = await votingContract.voteElection(proposalId, candidateAddress)
    await tx.wait()

    return tx
  }

  private async getVotingContract(votingContractAddress: string): Promise<Contract> {
    const votingContract = await this.web3Library.getContract(votingContractAddress, VOTING_ABI)

    return votingContract
  }

  async getContract(votingAddress: string): Promise<Contract> {
    const contractService = this.getContractService(votingAddress)

    return await contractService.getContract()
  }
  private getContractService(votingAddress: string): SmartContract {
    return new SmartContract(votingAddress, VOTING_ABI)
  }

  async isPaused(votingAddress: string): Promise<boolean> {
    const voting = await this.getContract(votingAddress)

    return await voting.paused()
  }

  async pause(votingAddress: string): Promise<TransactionResponse> {
    const voting = await this.getContract(votingAddress)
    const tx = await voting.pause()
    await tx.wait()

    return tx
  }

  async unpause(votingAddress: string): Promise<TransactionResponse> {
    const voting = await this.getContract(votingAddress)
    const tx = await voting.unpause()
    await tx.wait()

    return tx
  }

  async transferOwnership(votingAddress: string, newOwner: string): Promise<TransactionResponse> {
    const voting = await this.getContract(votingAddress)
    const tx = await voting.transferOwnership(newOwner)
    await tx.wait()

    return tx
  }

  async getOwner(votingAddress: string): Promise<string> {
    const voting = await this.getContract(votingAddress)

    return await voting.owner()
  }
}
