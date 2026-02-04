import { config } from '../wagmi.config.ts'
import { getWalletClient, getPublicClient } from '@wagmi/core'
import { getLogs } from 'viem/actions'
import { parseAbiItem, type PublicClient, type Address } from 'viem'

import { writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { parseUnits } from 'viem/utils'
import { useCreateContractMutation } from '@/queries/contract.queries'
import { AD_CAMPAIGN_MANAGER_ABI } from '@/artifacts/abi/ad-campaign-manager'
import { CAMPAIGN_BYTECODE } from '@/artifacts/bytecode/adCampaignManager.ts'

export interface PaymentReleasedEvent extends Record<string, unknown> {
  campaignCode: string
  paymentAmount: bigint
}

interface AdCampaignCreatedEvent extends Record<string, unknown> {
  campaignCode: string
  budget: bigint
}

interface BudgetWithdrawnEvent extends Record<string, unknown> {
  campaignCode: string
  advertiser: string
  amount: bigint
}

interface PaymentReleasedOnWithdrawApprovalEvent extends Record<string, unknown> {
  campaignCode: string
  paymentAmount: bigint
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

export interface ExtendedPaymentReleasedOnWithdrawApprovalEvent extends PaymentReleasedOnWithdrawApprovalEvent {
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

export class AddCampaignService {
  private async deployAdCampaignManager(
    bankAddress: string,
    costPerClick: string,
    costPerImpression: string
  ): Promise<string> {
    const click = parseUnits(costPerClick, 18)
    const impression = parseUnits(costPerImpression, 18)
    const walletClient = await getWalletClient(config)

    const hash = await walletClient.deployContract({
      abi: AD_CAMPAIGN_MANAGER_ABI,
      bytecode: CAMPAIGN_BYTECODE as `0x${string}`,
      args: [click, impression, bankAddress as `0x${string}`],
      account: walletClient.account.address
    })

    const receipt = await waitForTransactionReceipt(config, { hash })
    if (!receipt.contractAddress) throw new Error('Deployment failed')
    return receipt.contractAddress
  }

  async createAdCampaignManager(
    bankAddress: string,
    costPerClick: string,
    costPerImpression: string,
    deployer: string,
    teamId: string
  ): Promise<string> {
    const address = await this.deployAdCampaignManager(bankAddress, costPerClick, costPerImpression)

    const createContractMutation = useCreateContractMutation()
    await createContractMutation.mutateAsync({
      body: {
        teamId: teamId,
        contractAddress: address,
        contractType: 'Campaign',
        deployer
      }
    })

    return address
  }

  async addAdmin(address: Address, admin: Address) {
    const hash = await writeContract(config, {
      address: address,
      abi: AD_CAMPAIGN_MANAGER_ABI,
      functionName: 'addAdmin',
      args: [admin]
    })

    return await waitForTransactionReceipt(config, { hash })
  }

  async removeAdmin(address: Address, admin: Address) {
    const hash = await writeContract(config, {
      address: address,
      abi: AD_CAMPAIGN_MANAGER_ABI,
      functionName: 'removeAdmin',
      args: [admin]
    })

    return await waitForTransactionReceipt(config, { hash })
  }

  async getAdminList(address: string): Promise<string[]> {
    const client = getPublicClient(config) as PublicClient
    const latestBlock = await client.getBlockNumber()

    const fromBlock = latestBlock > 9999n ? latestBlock - 9999n : 0n

    const adminAddedEvent = parseAbiItem('event AdminAdded(address indexed admin)')
    const adminRemovedEvent = parseAbiItem('event AdminRemoved(address indexed admin)')

    const [addedLogs, removedLogs] = await Promise.all([
      getLogs(client, {
        address: address as Address,
        event: adminAddedEvent,
        fromBlock: fromBlock,
        toBlock: latestBlock
      }),
      getLogs(client, {
        address: address as Address,
        event: adminRemovedEvent,
        fromBlock: fromBlock,
        toBlock: latestBlock
      })
    ])

    const set = new Set<Address>()

    for (const log of addedLogs) {
      if (log.args.admin) {
        set.add(log.args.admin)
      }
    }

    for (const log of removedLogs) {
      if (log.args.admin) {
        set.delete(log.args.admin)
      }
    }

    return Array.from(set)
  }

  async getEventsGroupedByCampaignCode(
    contractAddress: Address
  ): Promise<GetEventsGroupedByCampaignCodeResult> {
    try {
      const client = getPublicClient(config) as PublicClient
      const latestBlock = await client.getBlockNumber()

      const fromBlock = latestBlock > 9999n ? latestBlock - 9999n : 0n
      const [adCreated, released, withdrawn, releasedOnApproval] = await Promise.all([
        getLogs(client, {
          address: contractAddress,
          event: parseAbiItem('event AdCampaignCreated(string campaignCode, uint256 budget)'),
          fromBlock: fromBlock,
          toBlock: latestBlock
        }),
        getLogs(client, {
          address: contractAddress,
          event: parseAbiItem('event PaymentReleased(string campaignCode, uint256 paymentAmount)'),
          fromBlock: fromBlock,
          toBlock: latestBlock
        }),
        getLogs(client, {
          address: contractAddress,
          event: parseAbiItem(
            'event BudgetWithdrawn(string campaignCode, address advertiser, uint256 amount)'
          ),
          fromBlock: fromBlock,
          toBlock: latestBlock
        }),
        getLogs(client, {
          address: contractAddress,
          event: parseAbiItem(
            'event PaymentReleasedOnWithdrawApproval(string campaignCode, uint256 paymentAmount)'
          ),
          fromBlock: fromBlock,
          toBlock: latestBlock
        })
      ])

      const eventsByCampaignCode: EventsByCampaignCode = {}

      const group = <A extends Record<string, unknown>, T extends ExtendedEvent>(
        logs: { args: A }[],
        factory: (args: A) => T
      ) => {
        for (const log of logs) {
          const event = factory(log.args)
          const code = event.campaignCode
          if (!eventsByCampaignCode[code]) eventsByCampaignCode[code] = []
          eventsByCampaignCode[code].push(event)
        }
      }

      group<{ campaignCode: string; budget: bigint }, ExtendedAdCampaignCreatedEvent>(
        adCreated as { args: AdCampaignCreatedEvent }[],
        (args) => ({
          eventName: 'AdCampaignCreated',
          campaignCode: args.campaignCode!,
          budget: args.budget!
        })
      )

      group<PaymentReleasedEvent, ExtendedPaymentReleasedEvent>(
        released as { args: PaymentReleasedEvent }[],
        (args) => ({
          eventName: 'PaymentReleased',
          campaignCode: args.campaignCode,
          paymentAmount: args.paymentAmount
        })
      )

      group<BudgetWithdrawnEvent, ExtendedBudgetWithdrawnEvent>(
        withdrawn as { args: BudgetWithdrawnEvent }[],
        (args) => ({
          eventName: 'BudgetWithdrawn',
          campaignCode: args.campaignCode,
          advertiser: args.advertiser,
          amount: args.amount
        })
      )

      group<PaymentReleasedOnWithdrawApprovalEvent, ExtendedPaymentReleasedOnWithdrawApprovalEvent>(
        releasedOnApproval as { args: PaymentReleasedOnWithdrawApprovalEvent }[],
        (args) => ({
          eventName: 'PaymentReleasedOnWithdrawApproval',
          campaignCode: args.campaignCode,
          paymentAmount: args.paymentAmount
        })
      )

      return { status: 'success', events: eventsByCampaignCode }
    } catch (error) {
      return { status: 'error', error: { message: (error as Error).message } }
    }
  }
}
