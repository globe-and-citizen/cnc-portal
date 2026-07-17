/**
 * EXPERIMENT (getLogs vs indexer) — reconstruct the Bank transaction feed the
 * accounting/history UI needs directly from the RPC via `eth_getLogs`, decoded
 * with the Bank ABI, instead of Ponder's GraphQL. Produces the exact
 * `BankEventsQuery` shape so it can be swapped in for `useQuery(GET_BANK_EVENTS)`
 * with no downstream changes.
 *
 * Timestamps aren't in logs → one `getBlock` per unique block (deduped). Incoming
 * raw ERC-20 transfers (`rawContractTokenTransfers`) are left empty for now — they
 * live on the token contracts, not the Bank, so they'd need a separate query.
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import { parseAbiItem, parseEventLogs, type Abi, type AbiEvent, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { currentChainId, FEE_COLLECTOR_ADDRESS } from '@/constant'
import BankV1 from '@/artifacts/abi/V1/json/Bank.json'
import BankV01 from '@/artifacts/abi/V0.1/json/Bank.json'
import BankV0 from '@/artifacts/abi/V0/json/Bank.json'
import type { BankEventsQuery } from '@/types/ponder/bank'

// Union of the Bank event fragments across every deployed version, deduped by
// signature (V1 wins on collisions). A beacon proxy's logs span the ABIs of
// every implementation it ran, so decoding needs them all — this is what an
// indexer does per-version at index time. `parseEventLogs` matches each log's
// topic0 against any fragment in this array.
const BANK_EVENT_ABI: Abi = (() => {
  const seen = new Set<string>()
  const events: AbiEvent[] = []
  for (const abi of [BankV1, BankV01, BankV0] as unknown as AbiEvent[][]) {
    for (const item of abi) {
      if (item?.type !== 'event') continue
      const sig = `${item.name}(${(item.inputs ?? []).map((i) => i.type).join(',')})`
      if (seen.has(sig)) continue
      seen.add(sig)
      events.push(item)
    }
  }
  return events
})()

// CNC contracts were first deployed around this Polygon block — scan from here.
const START_BLOCK = 79743826n

// Fee events aren't on the Bank — the global FeeCollector emits FeePaid with the
// paying contract as the indexed `payer`, so we filter its logs by payer = bank.
const FEE_PAID_EVENT = parseAbiItem(
  'event FeePaid(string indexed contractType, address indexed payer, address indexed token, uint256 amount)'
)

const EMPTY: BankEventsQuery = {
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
}

export function useBankEventsViaLogs(contractAddress: MaybeRefOrGetter<string | undefined>) {
  const address = computed(() => toValue(contractAddress)?.toLowerCase())

  const query = useQuery({
    queryKey: computed(() => ['bank-events-logs', address.value]),
    enabled: computed(() => !!address.value),
    staleTime: 30_000,
    queryFn: async (): Promise<BankEventsQuery> => {
      const contract = address.value as Address
      const client = getPublicClient(config, { chainId: currentChainId })
      if (!client || !contract) return EMPTY

      const logs = await client.getLogs({
        address: contract,
        fromBlock: START_BLOCK,
        toBlock: 'latest'
      })
      const decoded = parseEventLogs({ abi: BANK_EVENT_ABI, logs, strict: false })

      // FeePaid events for this Bank, filtered server-side on the indexed payer.
      const feeLogs = FEE_COLLECTOR_ADDRESS
        ? await client.getLogs({
            address: FEE_COLLECTOR_ADDRESS as Address,
            event: FEE_PAID_EVENT,
            args: { payer: contract },
            fromBlock: START_BLOCK,
            toBlock: 'latest'
          })
        : []

      // One getBlock per unique block (bank + fee logs) for timestamps.
      const blockNumbers = [...new Set([...decoded, ...feeLogs].map((l) => l.blockNumber))]
      const blocks = await Promise.all(
        blockNumbers.map((blockNumber) => client.getBlock({ blockNumber }))
      )
      const tsByBlock = new Map(blocks.map((b) => [b.number, Number(b.timestamp)]))

      const out: BankEventsQuery = {
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
      }

      for (const log of decoded) {
        const id = `${log.transactionHash}-${log.logIndex}`
        const timestamp = tsByBlock.get(log.blockNumber ?? 0n) ?? 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args = (log.args ?? {}) as any
        const str = (v: unknown) => (typeof v === 'bigint' ? v.toString() : String(v))

        switch (log.eventName) {
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

      // FeePaid events (from the FeeCollector) → bankFeePaids, mirroring Ponder:
      // contractAddress = payer (the bank), feeCollector = the emitting contract.
      for (const log of feeLogs) {
        out.bankFeePaids.items.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          contractAddress: contract,
          feeCollector: log.address,
          token: (log.args.token ?? '') as string,
          amount: (log.args.amount ?? 0n).toString(),
          timestamp: tsByBlock.get(log.blockNumber ?? 0n) ?? 0
        })
      }

      return out
    }
  })

  // Mirror @vue/apollo-composable's shape so it drops into BankTransactions.vue.
  return {
    result: query.data,
    loading: query.isPending,
    error: query.error
  }
}
