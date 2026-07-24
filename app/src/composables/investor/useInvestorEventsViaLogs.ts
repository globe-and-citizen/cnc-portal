/**
 * EXPERIMENT (getLogs vs indexer) — InvestorV1 event feed from the RPC, in the
 * exact `InvestorEventsQuery` shape, via the shared `useContractEventsViaLogs`
 * base.
 */
import type { MaybeRefOrGetter } from 'vue'
import InvestorV1abi from '@/artifacts/abi/V1/json/InvestorV1.json'
import InvestorV01abi from '@/artifacts/abi/V0.1/json/InvestorV1.json'
import InvestorV0abi from '@/artifacts/abi/V0/json/InvestorV1.json'
import type { InvestorEventsQuery } from '@/types/ponder/investor'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext
} from '@/composables/eventsViaLogs'

const INVESTOR_EVENT_ABI = unionEventAbi([InvestorV1abi, InvestorV01abi, InvestorV0abi])

const empty = (): InvestorEventsQuery => ({
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
}: EventMapContext<InvestorEventsQuery>) => {
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

export function useInvestorEventsViaLogs(contractAddress: MaybeRefOrGetter<string | undefined>) {
  return useContractEventsViaLogs<InvestorEventsQuery>({
    contractAddress,
    queryKey: 'investor-events-logs',
    eventAbi: INVESTOR_EVENT_ABI,
    empty,
    mapEvent
  })
}
