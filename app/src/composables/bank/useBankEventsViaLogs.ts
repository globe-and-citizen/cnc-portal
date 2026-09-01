/**
 * EXPERIMENT (getLogs vs indexer) — reconstruct the Bank transaction feed from
 * the RPC via `eth_getLogs` instead of Ponder, in the exact `BankEventsQuery`
 * shape. Uses the shared `useContractEventsViaLogs` base; only the ABI union,
 * empty shape, and per-event mapping are Bank-specific.
 *
 * FeePaid events aren't on the Bank — the global FeeCollector emits them with
 * the paying contract as the indexed `payer`, fetched via `extraLogs`.
 *
 * Raw ERC-20 transfers (`rawContractTokenTransfers`) capture value that moves
 * in or out of the Bank without a Bank event of its own — most notably the
 * Community Credit (FixedReturn) funding sweep, which `safeTransfer`s the
 * principal straight to the Bank without calling its deposit function. They are
 * fetched from each supported token's `Transfer` logs filtered on the Bank as
 * `to` (incoming) or `from` (outgoing), then folded via `mapExtra`. Transfers
 * that a Bank event already accounts for (deposits, transfers, dividends, fees)
 * are dropped downstream in `buildRawBankTransactions` so nothing double-counts.
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
  type ChainClient,
  type DecodedLogLike,
  type EventMapContext,
  type ContractAddressInput
} from '@/composables/eventsViaLogs'

const BANK_EVENT_ABI = unionEventAbi([BankV1, BankV01, BankV0])

const FEE_PAID_EVENT = parseAbiItem(
  'event FeePaid(string indexed contractType, address indexed payer, address indexed token, uint256 amount)'
)

const TOKEN_SUPPORT_ADDED_EVENT = parseAbiItem(
  'event TokenSupportAdded(address indexed tokenAddress)'
)

const ERC20_TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
)

/**
 * Every token the Bank has ever declared support for, from its
 * `TokenSupportAdded` logs. Removals are intentionally ignored: a token that
 * received a transfer while supported must still be scanned even if support was
 * later dropped, so the union of ever-added tokens is the complete set.
 */
async function supportedTokenAddresses(client: ChainClient, bank: Address): Promise<Address[]> {
  const logs = await client.getLogs({
    address: bank,
    event: TOKEN_SUPPORT_ADDED_EVENT,
    fromBlock: START_BLOCK,
    toBlock: 'latest'
  })
  const tokens = new Set<string>()
  for (const log of logs) {
    const token = log.args?.tokenAddress
    if (token) tokens.add(token.toLowerCase())
  }
  return [...tokens] as Address[]
}

/** Raw ERC-20 `Transfer` logs where the Bank is the `to` or the `from`. */
async function rawTokenTransferLogs(client: ChainClient, bank: Address): Promise<DecodedLogLike[]> {
  const tokens = await supportedTokenAddresses(client, bank)
  const perToken = await Promise.all(
    tokens.map(async (token) => {
      const [incoming, outgoing] = await Promise.all([
        client.getLogs({
          address: token,
          event: ERC20_TRANSFER_EVENT,
          args: { to: bank },
          fromBlock: START_BLOCK,
          toBlock: 'latest'
        }),
        client.getLogs({
          address: token,
          event: ERC20_TRANSFER_EVENT,
          args: { from: bank },
          fromBlock: START_BLOCK,
          toBlock: 'latest'
        })
      ])
      return [...incoming, ...outgoing]
    })
  )
  return perToken.flat() as unknown as DecodedLogLike[]
}

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
        contractAddress: contract,
        sender: args.sender,
        to: args.to,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'TokenTransfer':
      out.bankTokenTransfers.items.push({
        id,
        contractAddress: contract,
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

export function useBankEventsViaLogs(contractAddress: MaybeRefOrGetter<ContractAddressInput>) {
  return useContractEventsViaLogs<BankEventsQuery>({
    contractAddress,
    queryKey: 'bank-events-logs',
    eventAbi: BANK_EVENT_ABI,
    empty,
    mapEvent,
    // Two log sets the Bank doesn't emit itself: the FeeCollector's FeePaid for
    // this Bank (filtered server-side on the indexed payer), and the raw ERC-20
    // Transfers to/from the Bank on its supported tokens.
    extraLogs: async (client, contract) => {
      const [fees, rawTransfers] = await Promise.all([
        FEE_COLLECTOR_ADDRESS
          ? client.getLogs({
              address: FEE_COLLECTOR_ADDRESS as Address,
              event: FEE_PAID_EVENT,
              args: { payer: contract },
              fromBlock: START_BLOCK,
              toBlock: 'latest'
            })
          : Promise.resolve([]),
        rawTokenTransferLogs(client, contract)
      ])
      return [...(fees as unknown as DecodedLogLike[]), ...rawTransfers]
    },
    mapExtra: ({ out, id, timestamp, contract, eventName, args, log }) => {
      if (eventName === 'Transfer') {
        const from = String(args.from ?? '').toLowerCase()
        const to = String(args.to ?? '').toLowerCase()
        const bank = contract.toLowerCase()
        const direction = to === bank ? (from === bank ? 'internal' : 'in') : 'out'
        out.rawContractTokenTransfers.items.push({
          id,
          tokenAddress: log.address,
          contractAddress: contract,
          direction,
          from: args.from as string,
          to: args.to as string,
          amount: str(args.value ?? 0n),
          timestamp
        })
        return
      }
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
