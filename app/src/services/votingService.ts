import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'

import VOTING_ABI from '@/artifacts/abi/voting.json'
import type { Contract } from 'ethers'
import { VOTING_ADDRESS } from '@/constant'
import type { Proposal } from '@/types'
import { SmartContract } from './contractService'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'
export interface IVotingService {
  web3Library: IWeb3Library
  addProposal(proposal: Partial<Proposal>): Promise<any>
  getProposals(teamId: Number): Promise<any>
  concludeProposal(teamId: Number, proposalId: Number): Promise<any>
  voteDirective(teamId: Number, proposalId: Number, directive: Number): Promise<any>
  voteElection(teamId: Number, proposalId: Number, candidateAddress: string): Promise<any>
  getEvents(): Promise<EventLog[] | Log[]>
}

export class VotingService implements IVotingService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  async addProposal(proposal: Partial<Proposal>): Promise<any> {
    try {
      const votingContract = await this.getVotingContract(VOTING_ADDRESS)
      const tx = await votingContract.addProposal(proposal)
      console.log(await this.getEvents())
      await tx.wait()
      return tx
    } catch (e) {
      console.log(e)
    }
  }
  async getProposals(teamId: Number): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    try {
      const proposals = await votingContract.getProposals(teamId)
      if (proposals === '0x' || !proposals) {
        console.log('No proposals found or returned data is empty.')
        return []
      }
      console.log(proposals)
      return proposals
    } catch (e) {
      console.log('Error fetching proposals:', e)
    }
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

  async getEvents(): Promise<EventLog[] | Log[]> {
    const contractService = this.getContractService(VOTING_ADDRESS)

    return await contractService.getEvents('ProposalAdded')
  }
  private getContractService(votingAddress: string): SmartContract {
    return new SmartContract(votingAddress, VOTING_ABI)
  }
}
