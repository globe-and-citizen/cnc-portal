import { parseAbiItem, type Address, type PublicClient } from 'viem'
import { getLogs } from 'viem/actions'

interface AdCampaignCreatedArgs extends Record<string, unknown> {
  campaignCode: string
  budget: bigint
}

interface PaymentReleasedArgs extends Record<string, unknown> {
  campaignCode: string
  paymentAmount: bigint
}

interface BudgetWithdrawnArgs extends Record<string, unknown> {
  campaignCode: string
  advertiser: string
  amount: bigint
}

interface PaymentReleasedOnWithdrawApprovalArgs extends Record<string, unknown> {
  campaignCode: string
  paymentAmount: bigint
}

export interface ExtendedAdCampaignCreatedEvent extends AdCampaignCreatedArgs {
  eventName: 'AdCampaignCreated'
}

export interface ExtendedPaymentReleasedEvent extends PaymentReleasedArgs {
  eventName: 'PaymentReleased'
}

export interface ExtendedBudgetWithdrawnEvent extends BudgetWithdrawnArgs {
  eventName: 'BudgetWithdrawn'
}

export interface ExtendedPaymentReleasedOnWithdrawApprovalEvent
  extends PaymentReleasedOnWithdrawApprovalArgs {
  eventName: 'PaymentReleasedOnWithdrawApproval'
}

export type ExtendedEvent =
  | ExtendedAdCampaignCreatedEvent
  | ExtendedPaymentReleasedEvent
  | ExtendedBudgetWithdrawnEvent
  | ExtendedPaymentReleasedOnWithdrawApprovalEvent

export interface EventsByCampaignCode {
  [campaignCode: string]: ExtendedEvent[]
}

export const AD_CAMPAIGN_CREATED_EVENT = parseAbiItem(
  'event AdCampaignCreated(string campaignCode, uint256 budget)'
)

export const PAYMENT_RELEASED_EVENT = parseAbiItem(
  'event PaymentReleased(string campaignCode, uint256 paymentAmount)'
)

export const BUDGET_WITHDRAWN_EVENT = parseAbiItem(
  'event BudgetWithdrawn(string campaignCode, address advertiser, uint256 amount)'
)

export const PAYMENT_RELEASED_ON_WITHDRAW_APPROVAL_EVENT = parseAbiItem(
  'event PaymentReleasedOnWithdrawApproval(string campaignCode, uint256 paymentAmount)'
)

const BLOCK_LOOKBACK = 9999n

export interface CampaignEventLogs {
  adCreated: readonly { args: AdCampaignCreatedArgs }[]
  released: readonly { args: PaymentReleasedArgs }[]
  withdrawn: readonly { args: BudgetWithdrawnArgs }[]
  releasedOnApproval: readonly { args: PaymentReleasedOnWithdrawApprovalArgs }[]
}

export async function fetchCampaignLogs(
  client: PublicClient,
  contractAddress: Address
): Promise<CampaignEventLogs> {
  const latestBlock = await client.getBlockNumber()
  const fromBlock = latestBlock > BLOCK_LOOKBACK ? latestBlock - BLOCK_LOOKBACK : 0n
  const [adCreated, released, withdrawn, releasedOnApproval] = await Promise.all([
    getLogs(client, {
      address: contractAddress,
      event: AD_CAMPAIGN_CREATED_EVENT,
      fromBlock,
      toBlock: latestBlock
    }),
    getLogs(client, {
      address: contractAddress,
      event: PAYMENT_RELEASED_EVENT,
      fromBlock,
      toBlock: latestBlock
    }),
    getLogs(client, {
      address: contractAddress,
      event: BUDGET_WITHDRAWN_EVENT,
      fromBlock,
      toBlock: latestBlock
    }),
    getLogs(client, {
      address: contractAddress,
      event: PAYMENT_RELEASED_ON_WITHDRAW_APPROVAL_EVENT,
      fromBlock,
      toBlock: latestBlock
    })
  ])
  return {
    adCreated: adCreated as readonly { args: AdCampaignCreatedArgs }[],
    released: released as readonly { args: PaymentReleasedArgs }[],
    withdrawn: withdrawn as readonly { args: BudgetWithdrawnArgs }[],
    releasedOnApproval: releasedOnApproval as readonly { args: PaymentReleasedOnWithdrawApprovalArgs }[]
  }
}

export function groupCampaignEventsByCode(logs: CampaignEventLogs): EventsByCampaignCode {
  const eventsByCampaignCode: EventsByCampaignCode = {}
  const push = (event: ExtendedEvent) => {
    if (!eventsByCampaignCode[event.campaignCode]) {
      eventsByCampaignCode[event.campaignCode] = []
    }
    eventsByCampaignCode[event.campaignCode]!.push(event)
  }
  for (const { args } of logs.adCreated) {
    push({
      eventName: 'AdCampaignCreated',
      campaignCode: args.campaignCode,
      budget: args.budget
    })
  }
  for (const { args } of logs.released) {
    push({
      eventName: 'PaymentReleased',
      campaignCode: args.campaignCode,
      paymentAmount: args.paymentAmount
    })
  }
  for (const { args } of logs.withdrawn) {
    push({
      eventName: 'BudgetWithdrawn',
      campaignCode: args.campaignCode,
      advertiser: args.advertiser,
      amount: args.amount
    })
  }
  for (const { args } of logs.releasedOnApproval) {
    push({
      eventName: 'PaymentReleasedOnWithdrawApproval',
      campaignCode: args.campaignCode,
      paymentAmount: args.paymentAmount
    })
  }
  return eventsByCampaignCode
}
