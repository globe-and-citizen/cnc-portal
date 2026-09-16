/**
 * EXPERIMENT (getLogs vs indexer) — InvestorV1 event feed from the RPC, in the
 * exact `InvestorEventFeed` shape, via the shared `useContractEventsViaLogs`
 * base.
 */
import type { MaybeRefOrGetter } from 'vue'
import { investorAbi as investorV1Abi } from '@/artifacts/abi/V1/generated'
import { investorAbi as investorV01Abi } from '@/artifacts/abi/V0.1/generated'
import { investorAbi as investorV0Abi } from '@/artifacts/abi/V0/generated'
import type { InvestorEventFeed } from '@/types/contract-events/investor'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext,
  type ContractAddressInput
} from '@/composables/eventsViaLogs'

const INVESTOR_EVENT_ABI = unionEventAbi([investorV1Abi, investorV01Abi, investorV0Abi])

const empty = (): InvestorEventFeed => ({
  investorMints: { items: [] },
  investorDividendDistributeds: { items: [] },
  investorDividendPaids: { items: [] },
  investorDividendPaymentFaileds: { items: [] }
})

const mapEvent = ({
  out,
  id,
  timestamp,
  contract,
  eventName,
  args
}: EventMapContext<InvestorEventFeed>) => {
  switch (eventName) {
    case 'Minted':
      out.investorMints.items.push({
        id,
        contractAddress: contract,
        shareholder: args.shareholder,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'DividendDistributed':
      out.investorDividendDistributeds.items.push({
        id,
        contractAddress: contract,
        distributor: args.distributor,
        token: args.token,
        totalAmount: str(args.totalAmount),
        shareholderCount: str(args.shareholderCount),
        timestamp
      })
      break
    case 'DividendPaid':
      out.investorDividendPaids.items.push({
        id,
        contractAddress: contract,
        shareholder: args.shareholder,
        token: args.token,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'DividendPaymentFailed':
      out.investorDividendPaymentFaileds.items.push({
        id,
        contractAddress: contract,
        shareholder: args.shareholder,
        token: args.token,
        amount: str(args.amount),
        reason: args.reason,
        timestamp
      })
      break
  }
}

export function useInvestorEventsViaLogs(contractAddress: MaybeRefOrGetter<ContractAddressInput>) {
  return useContractEventsViaLogs<InvestorEventFeed>({
    contractAddress,
    queryKey: 'investor-events-logs',
    eventAbi: INVESTOR_EVENT_ABI,
    empty,
    mapEvent
  })
}
