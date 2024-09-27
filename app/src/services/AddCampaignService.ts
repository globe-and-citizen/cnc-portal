import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import ADD_CAMPAIGN_ARTIFACT from '../artifacts/abi/AdCampaignManager.json'
import type { Contract } from 'ethers'
import { SmartContract } from './contractService'
import type { EventLog } from 'ethers'
import type { Log } from 'ethers'
import { ethers } from 'ethers'
import { useCustomFetch } from '@/composables/useCustomFetch'
//import { AdCampaignEventType } from '@/types'

export interface IAddCampaignService {
  web3Library: IWeb3Library
  createAdCampaignManager(
    _bankContractAddress: string,
    _costPerClick: string,
    _costPerImpression: string,
    deployerAddress: string,
    teamId: string
  ): Promise<string>
  //createAdCampaign(budget: string): Promise<string>
  //claimPayment(campaignCode: string, currentAmountSpent: string): Promise<any>
  //requestWithdrawal(campaignCode: string, currentAmountSpent: string): Promise<any>
  getEvents(bankAddress: string, type: string): Promise<EventLog[] | Log[]>
  getContractData(addCampaignContractAddress: string): Promise<{ key: string; value: string }[]> // Updated type for the return value
}

export class AddCampaignService implements IAddCampaignService {
  web3Library: IWeb3Library

  constructor(web3Library: IWeb3Library = EthersJsAdapter.getInstance()) {
    this.web3Library = web3Library
  }

  private async deployAdCampaignManager(
    _bankContractAddress: string,
    _costPerClick: string,
    _costPerImpression: string
  ): Promise<string> {
    const _costPerClickInWei = ethers.parseUnits(_costPerClick, 'ether')
    const _costPerImpressionInWei = ethers.parseUnits(_costPerImpression, 'ether')

    const factory = await this.web3Library.getFactoryContract(
      ADD_CAMPAIGN_ARTIFACT['abi'],
      ADD_CAMPAIGN_ARTIFACT['bytecode']
    )

    const deployment = await factory.deploy(
      _costPerClickInWei,
      _costPerImpressionInWei,
      _bankContractAddress
    ) // Deploying the contract
    const contractInstance = await deployment.waitForDeployment()

    return await contractInstance.getAddress()
  }

  async createAdCampaignManager(
    _bankContractAddress: string,
    _costPerClick: string,
    _costPerImpression: string,
    deployerAddress: string,
    teamId: string
  ): Promise<string> {
    const adCamapaignAddress = await this.deployAdCampaignManager(
      _bankContractAddress,
      _costPerClick,
      _costPerImpression
    )

    const contractPayload = {
      address: adCamapaignAddress,
      type: 'Campaign',
      deployer: deployerAddress,
      admins: [deployerAddress]
    }
    await useCustomFetch<string>(`teams/${teamId}`).put({ contract: contractPayload }).json()

    return adCamapaignAddress
  }

  //   async claimPayment(campaignCode: string, currentAmountSpent: string): Promise<any> {
  //     const contractService = this.getContractService() // No specific address needed
  //     const tx = await contractService.getContract().claimPayment(campaignCode, this.web3Library.parseEther(currentAmountSpent))
  //     await tx.wait()

  //     return tx
  //   }

  //   async requestWithdrawal(campaignCode: string, currentAmountSpent: string): Promise<any> {
  //     const contractService = this.getContractService() // No specific address needed
  //     const tx = await contractService.getContract().requestAndApproveWithdrawal(campaignCode, this.web3Library.parseEther(currentAmountSpent))
  //     await tx.wait()

  //     return tx
  //   }

  // Updated getContractData method included in the interface
  async getContractData(
    addCampaignContractAddress: string
  ): Promise<{ key: string; value: string }[]> {
    const contractService = this.getContractService(addCampaignContractAddress)

    const contract = await contractService.getContract() // Retrieve contract instance
    const datas: Array<{ key: string; value: string }> = []

    // Loop through ABI to find viewable or pure functions
    for (const item of ADD_CAMPAIGN_ARTIFACT['abi']) {
      if (
        item.type === 'function' &&
        (item.stateMutability === 'view' || item.stateMutability === 'pure') &&
        item.inputs?.length === 0
      ) {
        try {
          // Dynamically call the contract function using its name
          if(item?.name)
          {
            const result = await contract[item.name]()

            // Add to the array of key-value pairs
            datas.push({
              key: item.name,
              value: result.toString() // Convert BigNumber or other types to string
            })
          }
          
        } catch (error) {
          console.error(`Error calling ${item.name}:`, error)
        }
      }
    }
    return datas
  }

  async getEvents(
    addCampaignAddress: string,
    type: 'CampaignCreated'
  ): Promise<EventLog[] | Log[]> {
    const contractService = this.getContractService(addCampaignAddress)

    return await contractService.getEvents(type)
  }

  async getContract(addCampaignContractAddress: string): Promise<Contract> {
    const contractService = this.getContractService(addCampaignContractAddress)

    return await contractService.getContract()
  }

  private getContractService(addCampaignContractAddress: string): SmartContract {
    return new SmartContract(addCampaignContractAddress, ADD_CAMPAIGN_ARTIFACT['abi'])
  }
}
