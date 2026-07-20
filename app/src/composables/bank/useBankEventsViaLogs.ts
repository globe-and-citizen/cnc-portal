/**
 * EXPERIMENT (getLogs vs indexer) — reconstruct the Bank transaction feed from
 * the RPC via `eth_getLogs` instead of Ponder, in the exact `BankEventsQuery`
 * shape. Uses the shared `useContractEventsViaLogs` base; only the ABI union,
 * empty shape, and per-event mapping are Bank-specific.
 *
 * FeePaid events aren't on the Bank — the global FeeCollector emits them with
 * the paying contract as the indexed `payer`, fetched via `extraLogs`. Incoming
 * raw ERC-20 transfers (`rawContractTokenTransfers`) are left empty for now.
 */
import type { MaybeRefOrGetter } from 'vue'
import { parseAbiItem, type Address } from 'viem'
import { FEE_COLLECTOR_ADDRESS } from '@/constant'
import BankV1 from '@/artifacts/abi/V1/json/Bank.json'
import BankV01 from '@/artifacts/abi/V0.1/json/Bank.json'
import BankV0 from '@/artifacts/abi/V0/json/Bank.json'
import type { BankEventsQuery } from '@/types/ponder/bank'
import {
  START_BLOCK,
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext
} from '@/composables/eventsViaLogs'

const BANK_EVENT_ABI = unionEventAbi([BankV1, BankV01, BankV0])

const FEE_PAID_EVENT = parseAbiItem(
  'event FeePaid(string indexed contractType, address indexed payer, address indexed token, uint256 amount)'
)

const empty = (): BankEventsQuery => ({
  bankDeposits: { items: [] },
  bankTokenDeposits: { items: [] },
  bankTransfers: { items: [] },
  bankTokenTransfers: { items: [] },
  bankDividendDistributionTriggereds: { items: [] },
  bankFeePaids: { items: [] },
  bankOwnershipTransferreds: { items: [] },
  bankTokenSupportAddeds: { items: [] },
  bankTokenSupportRemoveds: { items: [] },
  rawContractTokenTransfers: { items: [] }
})

const mapEvent = ({
  out,
  id,
  timestamp,
  contract,
  eventName,
  args
}: EventMapContext<BankEventsQuery>) => {
  switch (eventName) {
    case 'Deposited':
      out.bankDeposits.items.push({
        id,
        contractAddress: contract,
        depositor: args.depositor,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'TokenDeposited':
      out.bankTokenDeposits.items.push({
        id,
        contractAddress: contract,
        depositor: args.depositor,
        token: args.token,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'Transfer':
      out.bankTransfers.items.push({
        id,
        sender: args.sender,
        to: args.to,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'TokenTransfer':
      out.bankTokenTransfers.items.push({
        id,
        sender: args.sender,
        to: args.to,
        token: args.token,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'DividendDistributionTriggered':
      out.bankDividendDistributionTriggereds.items.push({
        id,
        contractAddress: contract,
        investor: args.investor,
        token: args.token,
        totalAmount: str(args.totalAmount),
        timestamp
      })
      break
    case 'OwnershipTransferred':
      out.bankOwnershipTransferreds.items.push({
        id,
        contractAddress: contract,
        previousOwner: args.previousOwner,
        newOwner: args.newOwner,
        timestamp
      })
      break
    case 'TokenSupportAdded':
      out.bankTokenSupportAddeds.items.push({
        id,
        contractAddress: contract,
        tokenAddress: args.tokenAddress,
        timestamp
      })
      break
    case 'TokenSupportRemoved':
      out.bankTokenSupportRemoveds.items.push({
        id,
        contractAddress: contract,
        tokenAddress: args.tokenAddress,
        timestamp
      })
      break
  }
}

export function useBankEventsViaLogs(contractAddress: MaybeRefOrGetter<string | undefined>) {
  return useContractEventsViaLogs<BankEventsQuery>({
    contractAddress,
    queryKey: 'bank-events-logs',
    eventAbi: BANK_EVENT_ABI,
    empty,
    mapEvent,
    // FeePaid for this Bank, filtered server-side on the indexed payer.
    extraLogs: (client, contract) =>
      FEE_COLLECTOR_ADDRESS
        ? client.getLogs({
            address: FEE_COLLECTOR_ADDRESS as Address,
            event: FEE_PAID_EVENT,
            args: { payer: contract },
            fromBlock: START_BLOCK,
            toBlock: 'latest'
          })
        : Promise.resolve([]),
    mapExtra: ({ out, id, timestamp, contract, args, log }) => {
      out.bankFeePaids.items.push({
        id,
        contractAddress: contract,
        feeCollector: log.address,
        token: (args.token ?? '') as string,
        amount: str(args.amount ?? 0n),
        timestamp
      })
    }
  })
}
