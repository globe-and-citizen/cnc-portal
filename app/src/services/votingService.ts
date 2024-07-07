import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'

import VOTING_ABI from '@/artifacts/abi/voting.json'
import type { Contract } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { VOTING_ADDRESS } from '@/constant'
import type { Proposal } from '@/types'
import { SmartContract } from './contractService'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'
export interface IVotingService {
  web3Library: IWeb3Library
  addProposal(proposal: Partial<Proposal>): Promise<any>
  getProposals(): Promise<any>
  concludeProposal(proposalId: number): Promise<any>
  voteDirective(proposalId: number, directive: number): Promise<any>
  voteElection(electionId: number, candidateAddress: string): Promise<any>
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
  async getProposals(): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    try {
      const proposals = await votingContract.getProposals()
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
  async concludeProposal(proposalId: number): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.concludeProposal(proposalId)
    await tx.wait()

    return tx
  }
  async voteDirective(proposalId: number, directive: number): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.voteDirective(proposalId, directive)
    await tx.wait()

    return tx
  }
  async voteElection(electionId: number, candidateAddress: string): Promise<any> {
    const votingContract = await this.getVotingContract(VOTING_ADDRESS)
    const tx = await votingContract.voteElection(electionId, candidateAddress)
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
