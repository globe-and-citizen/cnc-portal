/**
 * EXPERIMENT (getLogs vs indexer) — FixedReturn (Community Credit) event feed
 * from the RPC via `eth_getLogs` instead of Ponder, in the exact
 * `FixedReturnEventsQuery` shape. Uses the shared `useContractEventsViaLogs`
 * base; only the ABI union, empty shape, and per-event mapping are
 * FixedReturn-specific.
 */
import type { MaybeRefOrGetter } from 'vue'
import FixedReturnAbi from '@/artifacts/abi/json/FixedReturn.json'
import FixedReturnV2Abi from '@/artifacts/abi/V2/json/FixedReturn.json'
import type { FixedReturnEventsQuery } from '@/types/ponder/fixedReturn'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext
} from '@/composables/eventsViaLogs'

const FIXED_RETURN_EVENT_ABI = unionEventAbi([FixedReturnAbi, FixedReturnV2Abi])

const empty = (): FixedReturnEventsQuery => ({
  fixedReturnLendingOfferCreateds: { items: [] },
  fixedReturnFundsLents: { items: [] },
  fixedReturnLenderRepaids: { items: [] },
  fixedReturnLendingOfferFundeds: { items: [] },
  fixedReturnLendingOfferRefundables: { items: [] },
  fixedReturnPartialFundingAccepteds: { items: [] },
  fixedReturnPrincipalRefundeds: { items: [] },
  fixedReturnRefundsDistributeds: { items: [] },
  fixedReturnRepaymentDistributeds: { items: [] },
  fixedReturnOwnershipTransferreds: { items: [] },
  fixedReturnTokenSupportAddeds: { items: [] },
  fixedReturnTokenSupportRemoveds: { items: [] }
})

const mapEvent = ({
  out,
  id,
  timestamp,
  contract,
  eventName,
  args
}: EventMapContext<FixedReturnEventsQuery>) => {
  switch (eventName) {
    case 'LendingOfferCreated':
      out.fixedReturnLendingOfferCreateds.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        token: args.token,
        fundingTarget: str(args.fundingTarget),
        timestamp
      })
      break
    case 'FundsLent':
      out.fixedReturnFundsLents.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        lender: args.lender,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'LenderRepaid':
      out.fixedReturnLenderRepaids.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        lender: args.lender,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'LendingOfferFunded':
      out.fixedReturnLendingOfferFundeds.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        timestamp
      })
      break
    case 'LendingOfferRefundable':
      out.fixedReturnLendingOfferRefundables.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        timestamp
      })
      break
    case 'PartialFundingAccepted':
      out.fixedReturnPartialFundingAccepteds.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        totalFunded: str(args.totalFunded),
        timestamp
      })
      break
    case 'PrincipalRefunded':
      out.fixedReturnPrincipalRefundeds.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        lender: args.lender,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'RefundsDistributed':
      out.fixedReturnRefundsDistributeds.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        totalAmount: str(args.totalAmount),
        timestamp
      })
      break
    case 'RepaymentDistributed':
      out.fixedReturnRepaymentDistributeds.items.push({
        id,
        contractAddress: contract,
        offerId: str(args.offerId),
        totalAmount: str(args.totalAmount),
        timestamp
      })
      break
    case 'OwnershipTransferred':
      out.fixedReturnOwnershipTransferreds.items.push({
        id,
        contractAddress: contract,
        previousOwner: args.previousOwner,
        newOwner: args.newOwner,
        timestamp
      })
      break
    case 'TokenSupportAdded':
      out.fixedReturnTokenSupportAddeds.items.push({
        id,
        contractAddress: contract,
        tokenAddress: args.tokenAddress,
        timestamp
      })
      break
    case 'TokenSupportRemoved':
      out.fixedReturnTokenSupportRemoveds.items.push({
        id,
        contractAddress: contract,
        tokenAddress: args.tokenAddress,
        timestamp
      })
      break
  }
}

export function useFixedReturnEventsViaLogs(contractAddress: MaybeRefOrGetter<string | undefined>) {
  return useContractEventsViaLogs<FixedReturnEventsQuery>({
    contractAddress,
    queryKey: 'fixed-return-events-logs',
    eventAbi: FIXED_RETURN_EVENT_ABI,
    empty,
    mapEvent
  })
}
