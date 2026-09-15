/**
 * EXPERIMENT (getLogs vs indexer) — SafeDepositRouter event feed from the RPC,
 * in the exact `SafeDepositRouterEventFeed` shape, via the shared
 * `useContractEventsViaLogs` base.
 */
import type { MaybeRefOrGetter } from 'vue'
import { safeDepositRouterAbi as safeRouterV1Abi } from '@/artifacts/abi/V1/generated'
import { safeDepositRouterAbi as safeRouterV01Abi } from '@/artifacts/abi/V0.1/generated'
import { safeDepositRouterAbi as safeRouterV0Abi } from '@/artifacts/abi/V0/generated'
import type { SafeDepositRouterEventFeed } from '@/types/contract-events/investor'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext,
  type ContractAddressInput
} from '@/composables/eventsViaLogs'

const SAFE_ROUTER_EVENT_ABI = unionEventAbi([safeRouterV1Abi, safeRouterV01Abi, safeRouterV0Abi])

const empty = (): SafeDepositRouterEventFeed => ({
  safeDeposits: { items: [] },
  safeDepositsEnableds: { items: [] },
  safeDepositsDisableds: { items: [] },
  safeAddressUpdateds: { items: [] },
  safeMultiplierUpdateds: { items: [] }
})

const mapEvent = ({
  out,
  id,
  log,
  timestamp,
  contract,
  eventName,
  args
}: EventMapContext<SafeDepositRouterEventFeed>) => {
  switch (eventName) {
    case 'Deposited':
      out.safeDeposits.items.push({
        id,
        ...(log.transactionHash ? { txHash: log.transactionHash } : {}),
        contractAddress: contract,
        depositor: args.depositor,
        token: args.token,
        tokenAmount: str(args.tokenAmount),
        sherAmount: str(args.sherAmount),
        timestamp
      })
      break
    case 'DepositsEnabled':
      out.safeDepositsEnableds.items.push({
        id,
        contractAddress: contract,
        enabledBy: args.enabledBy,
        timestamp
      })
      break
    case 'DepositsDisabled':
      out.safeDepositsDisableds.items.push({
        id,
        contractAddress: contract,
        disabledBy: args.disabledBy,
        timestamp
      })
      break
    case 'SafeAddressUpdated':
      out.safeAddressUpdateds.items.push({
        id,
        contractAddress: contract,
        oldSafe: args.oldSafe,
        newSafe: args.newSafe,
        timestamp
      })
      break
    case 'MultiplierUpdated':
      out.safeMultiplierUpdateds.items.push({
        id,
        contractAddress: contract,
        oldMultiplier: str(args.oldMultiplier),
        newMultiplier: str(args.newMultiplier),
        timestamp
      })
      break
  }
}

export function useSafeDepositRouterEventsViaLogs(
  contractAddress: MaybeRefOrGetter<ContractAddressInput>
) {
  return useContractEventsViaLogs<SafeDepositRouterEventFeed>({
    contractAddress,
    queryKey: 'safe-deposit-router-events-logs',
    eventAbi: SAFE_ROUTER_EVENT_ABI,
    empty,
    mapEvent
  })
}
