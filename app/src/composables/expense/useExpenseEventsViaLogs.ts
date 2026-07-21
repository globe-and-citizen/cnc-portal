/**
 * EXPERIMENT (getLogs vs indexer) — ExpenseAccount event feed from the RPC, in
 * the exact `ExpenseEventsQuery` shape, via the shared `useContractEventsViaLogs`
 * base. Scope: the contract's OWN events; incoming Bank→Expense transfers remain
 * a separate Ponder feed in the component.
 */
import type { MaybeRefOrGetter } from 'vue'
import ExpenseV1 from '@/artifacts/abi/V1/json/ExpenseAccountEIP712.json'
import ExpenseV01 from '@/artifacts/abi/V0.1/json/ExpenseAccountEIP712.json'
import ExpenseV0 from '@/artifacts/abi/V0/json/ExpenseAccountEIP712.json'
import type { ExpenseEventsQuery } from '@/types/ponder/expense'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext
} from '@/composables/eventsViaLogs'

const EXPENSE_EVENT_ABI = unionEventAbi([ExpenseV1, ExpenseV01, ExpenseV0])

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

const mapEvent = ({
  out,
  id,
  timestamp,
  contract,
  eventName,
  args
}: EventMapContext<ExpenseEventsQuery>) => {
  switch (eventName) {
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
        activated: eventName === 'ApprovalActivated',
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

export function useExpenseEventsViaLogs(contractAddress: MaybeRefOrGetter<string | undefined>) {
  return useContractEventsViaLogs<ExpenseEventsQuery>({
    contractAddress,
    queryKey: 'expense-events-logs',
    eventAbi: EXPENSE_EVENT_ABI,
    empty,
    mapEvent
  })
}
