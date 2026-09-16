/**
 * ExpenseAccount event feed from the RPC in the `ExpenseEventFeed` shape via
 * the shared `useContractEventsViaLogs` base. Scope: the contract's OWN events;
 * incoming Bank→Expense transfers use the dedicated Bank RPC-log feed.
 */
import type { MaybeRefOrGetter } from 'vue'
import { expenseAccountEip712Abi as expenseV1Abi } from '@/artifacts/abi/V1/generated'
import { expenseAccountEip712Abi as expenseV01Abi } from '@/artifacts/abi/V0.1/generated'
import { expenseAccountEip712Abi as expenseV0Abi } from '@/artifacts/abi/V0/generated'
import type { ExpenseEventFeed } from '@/types/contract-events/expense'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext,
  type ContractAddressInput
} from '@/composables/eventsViaLogs'

const EXPENSE_EVENT_ABI = unionEventAbi([expenseV1Abi, expenseV01Abi, expenseV0Abi])

const empty = (): ExpenseEventFeed => ({
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
}: EventMapContext<ExpenseEventFeed>) => {
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

export function useExpenseEventsViaLogs(contractAddress: MaybeRefOrGetter<ContractAddressInput>) {
  return useContractEventsViaLogs<ExpenseEventFeed>({
    contractAddress,
    queryKey: 'expense-events-logs',
    eventAbi: EXPENSE_EVENT_ABI,
    empty,
    mapEvent
  })
}
