import { EthersJsAdapter, type IWeb3Library } from '@/adapters/web3LibraryAdapter'
import ADD_CAMPAIGN_ARTIFACT from '../artifacts/abi/AdCampaignManager.json'
import { EventLog, Log, ethers, TransactionReceipt } from 'ethers'
import { SmartContract } from './contractService'

import { useCustomFetch } from '@/composables/useCustomFetch'

export interface IAddCampaignService {
  web3Library: IWeb3Library
  createAdCampaignManager(
    _bankContractAddress: string,
    _costPerClick: string,
    _costPerImpression: string,
    deployerAddress: string,
    teamId: string
  ): Promise<string>

  getEvents(bankAddress: string, type: string): Promise<EventLog[] | Log[]>
  getContractData(addCampaignContractAddress: string): Promise<{ key: string; value: string }[]> // Updated type for the return value
  addAdmin(addCampaignContractAddress: string, adminAddress: string): Promise<TransactionReceipt>
  removeAdmin(addCampaignContractAddress: string,adminAddress:string): Promise<TransactionReceipt>
  getAdminList(addCampaignContractAddress: string): Promise<string[]>
  removeAdmin(addCampaignContractAddress: string,adminAddress:string): Promise<TransactionReceipt>
}

export interface PaymentReleasedEvent {
  campaignCode: string
  paymentAmount: ethers.BigNumberish
}

interface AdCampaignCreatedEvent {
  campaignCode: string
  budget: ethers.BigNumberish
}

interface BudgetWithdrawnEvent {
  campaignCode: string
  advertiser: string
  amount: ethers.BigNumberish
}

interface PaymentReleasedOnWithdrawApprovalEvent {
  campaignCode: string
  paymentAmount: ethers.BigNumberish
}

export interface EventsByCampaignCode {
  [key: string]: ExtendedEvent[]
}

export interface GetEventsGroupedByCampaignCodeResult {
  status: 'success' | 'error'
  events?: EventsByCampaignCode
  error?: { message: string }
}

export interface ExtendedPaymentReleasedEvent extends PaymentReleasedEvent {
  eventName: 'PaymentReleased'
}

interface ExtendedBudgetWithdrawnEvent extends BudgetWithdrawnEvent {
  eventName: 'BudgetWithdrawn'
}

export interface ExtendedPaymentReleasedOnWithdrawApprovalEvent
  extends PaymentReleasedOnWithdrawApprovalEvent {
  eventName: 'PaymentReleasedOnWithdrawApproval'
}

export interface ExtendedAdCampaignCreatedEvent extends AdCampaignCreatedEvent {
  eventName: 'AdCampaignCreated'
}

export type ExtendedEvent =
  | ExtendedPaymentReleasedEvent
  | ExtendedBudgetWithdrawnEvent
  | ExtendedPaymentReleasedOnWithdrawApprovalEvent
  | ExtendedAdCampaignCreatedEvent

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
    await useCustomFetch<string>(`teams/${teamId}`).put({ teamContract: contractPayload }).json()

    return adCamapaignAddress
  }

  async addAdmin(addCampaignContractAddress: string, adminAddress: string) {
    const contractService = this.getContractService(addCampaignContractAddress)
    const contract = await contractService.getContract() // Retrieve contract instance
    const tx = await contract.addAdmin(adminAddress)

    const receipt = await tx.wait()

    return receipt
  }

  async removeAdmin(addCampaignContractAddress:string,adminAddress: string){
    const contractService = this.getContractService(addCampaignContractAddress)
    const contract = await contractService.getContract() // Retrieve contract instance
    const tx = await contract.removeAdmin(adminAddress)
    
    const receipt = await tx.wait()

    return receipt
  }

  async getAdminList(addCampaignContractAddress: string): Promise<string[]> {
    const contractService = this.getContractService(addCampaignContractAddress)
    const contract = await contractService.getContract() // Retrieve contract instance
    const filterAdded = contract.filters.AdminAdded()
    const filterRemoved = contract.filters.AdminRemoved()

    // Get all AdminAdded events
    const adminAddedEvents = await contract.queryFilter(filterAdded)
    // Get all AdminRemoved events
    const adminRemovedEvents = await contract.queryFilter(filterRemoved)

    const adminSet = new Set<string>()

    // Add all admins from AdminAdded events
    // Add all admins from AdminAdded events
    adminAddedEvents.forEach((event) => {
      const adminAddress = (event as EventLog).args?.admin
      if (adminAddress) adminSet.add(adminAddress)
    })

    // Remove admins from AdminRemoved events
    adminRemovedEvents.forEach((event) => {
      const adminAddress = (event as EventLog).args?.admin
      if (adminAddress) adminSet.delete(adminAddress)
    })

    // Convert the Set to an array of unique admin addresses
    return Array.from(adminSet)
  }

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
          if (item?.name) {
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

  async getEventsGroupedByCampaignCode(
    addCampaignContractAddress: string,
  ): Promise<GetEventsGroupedByCampaignCodeResult> {
    try {
      const contractService = new SmartContract(addCampaignContractAddress, ADD_CAMPAIGN_ARTIFACT.abi);
      
  
      // Get all logs for the relevant events
      const adCampaignCreatedLogs = await contractService.getEvents('AdCampaignCreated');
      const paymentReleasedLogs = await contractService.getEvents('PaymentReleased');
      const paymentReleasedOnWithdrawApprovalLogs = await contractService.getEvents('PaymentReleasedOnWithdrawApproval');
      const budgetWithdrawnLogs = await contractService.getEvents('BudgetWithdrawn');
      
      // Group events by campaignCode
      const eventsByCampaignCode: EventsByCampaignCode = {};
  
      const processLogs = (logs: (EventLog | Log)[], eventName: string) => {
        logs.forEach((log) => {
          const currentLog = log as EventLog;
          console.log("the current log is ===========",currentLog)
          const args = currentLog.args as unknown;
          let code: string;
          let eventArgs: ExtendedEvent;

          switch (eventName) {
            case 'AdCampaignCreated': {
              const eventArgsTuple = args as [string, ethers.BigNumberish]; // Tuple: [campaignCode, budget]
              eventArgs = {
                campaignCode: eventArgsTuple[0] as string,  // Index 0 corresponds to campaignCode
                budget: eventArgsTuple[1] as ethers.BigNumberish,  // Index 1 corresponds to budget
                eventName: 'AdCampaignCreated'
              };
              console.log("event args ===========",eventArgs);
              code = eventArgs.campaignCode;
              break;
            }
            case 'PaymentReleased': {
              const eventArgsTuple = args as [string, ethers.BigNumberish]; // Tuple: [campaignCode, paymentAmount]
              eventArgs = {
              campaignCode: eventArgsTuple[0] as string,  // Index 0 corresponds to campaignCode
              paymentAmount: eventArgsTuple[1] as ethers.BigNumberish,  // Index 1 corresponds to paymentAmount
              eventName: 'PaymentReleased'
              };
              code = eventArgs.campaignCode;
              break;
            }
            case 'BudgetWithdrawn': {
              const eventArgsTuple = args as [string, string, ethers.BigNumberish]; // Tuple: [campaignCode, advertiser, amount]
              eventArgs = {
              campaignCode: eventArgsTuple[0] as string,  // Index 0 corresponds to campaignCode
              advertiser: eventArgsTuple[1] as string,  // Index 1 corresponds to advertiser
              amount: eventArgsTuple[2] as ethers.BigNumberish,  // Index 2 corresponds to amount
              eventName: 'BudgetWithdrawn'
              };
              code = eventArgs.campaignCode;
              break;
            }
            case 'PaymentReleasedOnWithdrawApproval': {
              const eventArgsTuple = args as [string, ethers.BigNumberish]; // Tuple: [campaignCode, paymentAmount]
              eventArgs = {
              campaignCode: eventArgsTuple[0] as string,  // Index 0 corresponds to campaignCode
              paymentAmount: eventArgsTuple[1] as ethers.BigNumberish,  // Index 1 corresponds to paymentAmount
              eventName: 'PaymentReleasedOnWithdrawApproval'
              };
              code = eventArgs.campaignCode;
              break;
            }
            default:
              return;
          }
          console.log("the eventname is ===========",eventName)
          console.log("the code is ===========",code)
          if (!eventsByCampaignCode[code]) {
            eventsByCampaignCode[code] = [];
          }
          eventsByCampaignCode[code].push(eventArgs);
          
        });
      };
  
      processLogs(adCampaignCreatedLogs, 'AdCampaignCreated');
      processLogs(paymentReleasedLogs, 'PaymentReleased');
      processLogs(paymentReleasedOnWithdrawApprovalLogs, 'PaymentReleasedOnWithdrawApproval');
      processLogs(budgetWithdrawnLogs, 'BudgetWithdrawn');
      console.log("eventsByCampaignCode ===============",eventsByCampaignCode)
      return { status: 'success', events: eventsByCampaignCode };
    } catch (error) {
      return { status: 'error', error: error as { message: string } };
    }
  }

  async getEvents(addCampaignAddress: string, type: string): Promise<EventLog[] | Log[]> {
    const contractService = this.getContractService(addCampaignAddress)

    return await contractService.getEvents(type)
  }

  private getContractService(addCampaignContractAddress: string): SmartContract {
    return new SmartContract(addCampaignContractAddress, ADD_CAMPAIGN_ARTIFACT['abi'])
  }
}
