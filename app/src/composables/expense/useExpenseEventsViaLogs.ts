/**
 * EXPERIMENT (getLogs vs indexer) — reconstruct the ExpenseAccount event feed
 * from the RPC via `eth_getLogs`, decoded with a union of the Expense ABIs
 * (V0/V0.1/V1), instead of Ponder's GraphQL. Produces the exact
 * `ExpenseEventsQuery` shape so it drops into `useQuery(GET_EXPENSE_EVENTS)`.
 *
 * Scope: only the Expense contract's OWN events. Incoming Bank→Expense token
 * transfers are a separate feed (still served by Ponder in the component).
 */
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getPublicClient } from '@wagmi/core'
import { parseEventLogs, type Abi, type AbiEvent, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { currentChainId } from '@/constant'
import ExpenseV1 from '@/artifacts/abi/V1/json/ExpenseAccountEIP712.json'
import ExpenseV01 from '@/artifacts/abi/V0.1/json/ExpenseAccountEIP712.json'
import ExpenseV0 from '@/artifacts/abi/V0/json/ExpenseAccountEIP712.json'
import type { ExpenseEventsQuery } from '@/types/ponder/expense'

// Union of Expense event fragments across versions, deduped by signature.
const EXPENSE_EVENT_ABI: Abi = (() => {
  const seen = new Set<string>()
  const events: AbiEvent[] = []
  for (const abi of [ExpenseV1, ExpenseV01, ExpenseV0] as unknown as AbiEvent[][]) {
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

const START_BLOCK = 79743826n

const empty = (): ExpenseEventsQuery => ({
  expenseDeposits: { items: [] },
  expenseTokenDeposits: { items: [] },
  expenseTransfers: { items: [] },
  expenseTokenTransfers: { items: [] },
  expenseApprovals: { items: [] },
  expenseOwnerTreasuryWithdrawNatives: { items: [] },
  expenseOwnerTreasuryWithdrawTokens: { items: [] },
  expenseTokenSupportAddeds: { items: [] },
  expenseTokenSupportRemoveds: { items: [] },
  expenseTokenAddressChangeds: { items: [] },
  expenseOwnershipTransferreds: { items: [] }
})

export function useExpenseEventsViaLogs(contractAddress: MaybeRefOrGetter<string | undefined>) {
  const address = computed(() => toValue(contractAddress)?.toLowerCase())

  const query = useQuery({
    queryKey: computed(() => ['expense-events-logs', address.value]),
    enabled: computed(() => !!address.value),
    staleTime: 30_000,
    queryFn: async (): Promise<ExpenseEventsQuery> => {
      const contract = address.value as Address
      const client = getPublicClient(config, { chainId: currentChainId })
      if (!client || !contract) return empty()

      const logs = await client.getLogs({
        address: contract,
        fromBlock: START_BLOCK,
        toBlock: 'latest'
      })
      const decoded = parseEventLogs({ abi: EXPENSE_EVENT_ABI, logs, strict: false })

      const blockNumbers = [...new Set(decoded.map((l) => l.blockNumber))]
      const blocks = await Promise.all(
        blockNumbers.map((blockNumber) => client.getBlock({ blockNumber }))
      )
      const tsByBlock = new Map(blocks.map((b) => [b.number, Number(b.timestamp)]))

      const out = empty()

      for (const log of decoded) {
        const id = `${log.transactionHash}-${log.logIndex}`
        const timestamp = tsByBlock.get(log.blockNumber ?? 0n) ?? 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const args = (log.args ?? {}) as any
        const str = (v: unknown) => (typeof v === 'bigint' ? v.toString() : String(v))

        switch (log.eventName) {
          case 'Deposited':
            out.expenseDeposits.items.push({
              id,
              contractAddress: contract,
              depositor: args.depositor,
              amount: str(args.amount),
              timestamp
            })
            break
          case 'TokenDeposited':
            out.expenseTokenDeposits.items.push({
              id,
              contractAddress: contract,
              depositor: args.depositor,
              token: args.token,
              amount: str(args.amount),
              timestamp
            })
            break
          case 'Transfer':
            out.expenseTransfers.items.push({
              id,
              contractAddress: contract,
              withdrawer: args.withdrawer,
              to: args.to,
              amount: str(args.amount),
              timestamp
            })
            break
          case 'TokenTransfer':
            out.expenseTokenTransfers.items.push({
              id,
              contractAddress: contract,
              withdrawer: args.withdrawer,
              to: args.to,
              token: args.token,
              amount: str(args.amount),
              timestamp
            })
            break
          case 'ApprovalActivated':
          case 'ApprovalDeactivated':
            out.expenseApprovals.items.push({
              id,
              contractAddress: contract,
              signatureHash: args.signatureHash,
              activated: log.eventName === 'ApprovalActivated',
              timestamp
            })
            break
          case 'OwnerTreasuryWithdrawNative':
            out.expenseOwnerTreasuryWithdrawNatives.items.push({
              id,
              contractAddress: contract,
              ownerAddress: args.ownerAddress,
              amount: str(args.amount),
              timestamp
            })
            break
          case 'OwnerTreasuryWithdrawToken':
            out.expenseOwnerTreasuryWithdrawTokens.items.push({
              id,
              contractAddress: contract,
              ownerAddress: args.ownerAddress,
              token: args.token,
              amount: str(args.amount),
              timestamp
            })
            break
          case 'TokenSupportAdded':
            out.expenseTokenSupportAddeds.items.push({
              id,
              contractAddress: contract,
              tokenAddress: args.tokenAddress,
              timestamp
            })
            break
          case 'TokenSupportRemoved':
            out.expenseTokenSupportRemoveds.items.push({
              id,
              contractAddress: contract,
              tokenAddress: args.tokenAddress,
              timestamp
            })
            break
          case 'TokenAddressChanged':
            out.expenseTokenAddressChangeds.items.push({
              id,
              contractAddress: contract,
              addressWhoChanged: args.addressWhoChanged,
              tokenSymbol: args.tokenSymbol,
              oldAddress: args.oldAddress,
              newAddress: args.newAddress,
              timestamp
            })
            break
          case 'OwnershipTransferred':
            out.expenseOwnershipTransferreds.items.push({
              id,
              contractAddress: contract,
              previousOwner: args.previousOwner,
              newOwner: args.newOwner,
              timestamp
            })
            break
        }
      }

      return out
    }
  })

  return {
    result: query.data,
    loading: query.isPending,
    error: query.error
  }
}
