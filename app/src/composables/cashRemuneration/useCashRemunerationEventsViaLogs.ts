/**
 * CashRemuneration (payroll) event feed from the RPC in the
 * `CashRemunerationEventFeed` shape via the shared `useContractEventsViaLogs`
 * base. Scope: the contract's OWN events; incoming Bank→payroll transfers use
 * the dedicated Bank RPC-log feed.
 */
import type { MaybeRefOrGetter } from 'vue'
import CashRemV1 from '@/artifacts/abi/V1/json/CashRemunerationEIP712.json'
import CashRemV01 from '@/artifacts/abi/V0.1/json/CashRemunerationEIP712.json'
import CashRemV0 from '@/artifacts/abi/V0/json/CashRemunerationEIP712.json'
import type { CashRemunerationEventFeed } from '@/types/contract-events/cash-remuneration'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext,
  type ContractAddressInput
} from '@/composables/eventsViaLogs'

const CASH_REM_EVENT_ABI = unionEventAbi([CashRemV1, CashRemV01, CashRemV0])

const empty = (): CashRemunerationEventFeed => ({
  cashRemunerationDeposits: { items: [] },
  cashRemunerationWithdraws: { items: [] },
  cashRemunerationWithdrawTokens: { items: [] },
  cashRemunerationWageClaims: { items: [] },
  cashRemunerationOwnerTreasuryWithdrawNatives: { items: [] },
  cashRemunerationOwnerTreasuryWithdrawTokens: { items: [] },
  cashRemunerationOfficerUpdateds: { items: [] },
  cashRemunerationTokenSupportAddeds: { items: [] },
  cashRemunerationTokenSupportRemoveds: { items: [] },
  cashRemunerationOwnershipTransferreds: { items: [] }
})

const mapEvent = ({
  out,
  id,
  timestamp,
  contract,
  eventName,
  args
}: EventMapContext<CashRemunerationEventFeed>) => {
  switch (eventName) {
    case 'Deposited':
      out.cashRemunerationDeposits.items.push({
        id,
        contractAddress: contract,
        depositor: args.depositor,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'Withdraw':
      out.cashRemunerationWithdraws.items.push({
        id,
        contractAddress: contract,
        withdrawer: args.withdrawer,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'WithdrawToken':
      out.cashRemunerationWithdrawTokens.items.push({
        id,
        contractAddress: contract,
        withdrawer: args.withdrawer,
        tokenAddress: args.tokenAddress,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'WageClaimEnabled':
    case 'WageClaimDisabled':
      out.cashRemunerationWageClaims.items.push({
        id,
        contractAddress: contract,
        signatureHash: args.signatureHash,
        enabled: eventName === 'WageClaimEnabled',
        timestamp
      })
      break
    case 'OwnerTreasuryWithdrawNative':
      out.cashRemunerationOwnerTreasuryWithdrawNatives.items.push({
        id,
        contractAddress: contract,
        ownerAddress: args.ownerAddress,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'OwnerTreasuryWithdrawToken':
      out.cashRemunerationOwnerTreasuryWithdrawTokens.items.push({
        id,
        contractAddress: contract,
        ownerAddress: args.ownerAddress,
        tokenAddress: args.tokenAddress,
        amount: str(args.amount),
        timestamp
      })
      break
    case 'OfficerAddressUpdated':
      out.cashRemunerationOfficerUpdateds.items.push({
        id,
        contractAddress: contract,
        newOfficerAddress: args.newOfficerAddress,
        timestamp
      })
      break
    case 'TokenSupportAdded':
      out.cashRemunerationTokenSupportAddeds.items.push({
        id,
        contractAddress: contract,
        tokenAddress: args.tokenAddress,
        timestamp
      })
      break
    case 'TokenSupportRemoved':
      out.cashRemunerationTokenSupportRemoveds.items.push({
        id,
        contractAddress: contract,
        tokenAddress: args.tokenAddress,
        timestamp
      })
      break
    case 'OwnershipTransferred':
      out.cashRemunerationOwnershipTransferreds.items.push({
        id,
        contractAddress: contract,
        previousOwner: args.previousOwner,
        newOwner: args.newOwner,
        timestamp
      })
      break
  }
}

export function useCashRemunerationEventsViaLogs(
  contractAddress: MaybeRefOrGetter<ContractAddressInput>
) {
  return useContractEventsViaLogs<CashRemunerationEventFeed>({
    contractAddress,
    queryKey: 'cash-remuneration-events-logs',
    eventAbi: CASH_REM_EVENT_ABI,
    empty,
    mapEvent
  })
}
