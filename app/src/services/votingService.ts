import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'

import VOTING_ABI from '@/artifacts/abi/voting.json'
import type { Contract } from 'ethers'
import { VOTING_ADDRESS } from '@/constant'
import type { Proposal } from '@/types'

export interface IVotingService {
  web3Library: IWeb3Library
  addProposal(proposal: Partial<Proposal>): Promise<any>
  getProposals(teamId: Number): Promise<any>
  concludeProposal(teamId: Number, proposalId: Number): Promise<any>
  voteDirective(teamId: Number, proposalId: Number, directive: Number): Promise<any>
  voteElection(teamId: Number, proposalId: Number, candidateAddress: string): Promise<any>
}

export class VotingService implements IVotingService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async addProposal(proposal: Partial<Proposal>): Promise<any> {
    proposal.id = 0
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.addProposal(proposal)
    await tx.wait()
    return tx
  }
  async getProposals(teamId: Number): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const proposals = await votingContract.getProposals(teamId)
    if (proposals === '0x' || !proposals) {
      // console.log('No proposals found or returned data is empty.')
      return []
    }
    // console.log(proposals)
    return proposals
  }
  async concludeProposal(teamId: Number, proposalId: Number): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.concludeProposal(teamId, proposalId)
    await tx.wait()

    return tx
  }
  async voteDirective(teamId: Number, proposalId: Number, vote: Number): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.voteDirective(teamId, proposalId, vote)
    await tx.wait()

    return tx
  }
  async voteElection(teamId: Number, proposalId: Number, candidateAddress: string): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.voteElection(teamId, proposalId, candidateAddress)
    await tx.wait()

    return tx
  }

  private async getVotingContract(votingContractAddress: string): Promise<Contract> {
    const votingContract = await this.web3Library.getContract(votingContractAddress, VOTING_ABI)

    return votingContract
  }
}
