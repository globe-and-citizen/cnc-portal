/**
 * EXPERIMENT (getLogs vs indexer) — SafeDepositRouter event feed from the RPC,
 * in the exact `SafeDepositRouterEventsQuery` shape, via the shared
 * `useContractEventsViaLogs` base.
 */
import type { MaybeRefOrGetter } from 'vue'
import SafeRouterV1 from '@/artifacts/abi/V1/json/SafeDepositRouter.json'
import SafeRouterV01 from '@/artifacts/abi/V0.1/json/SafeDepositRouter.json'
import SafeRouterV0 from '@/artifacts/abi/V0/json/SafeDepositRouter.json'
import type { SafeDepositRouterEventsQuery } from '@/types/ponder/investor'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext
} from '@/composables/eventsViaLogs'

const SAFE_ROUTER_EVENT_ABI = unionEventAbi([SafeRouterV1, SafeRouterV01, SafeRouterV0])

const empty = (): SafeDepositRouterEventsQuery => ({
  safeDeposits: { items: [] },
  safeDepositsEnableds: { items: [] },
  safeDepositsDisableds: { items: [] },
  safeAddressUpdateds: { items: [] },
  safeMultiplierUpdateds: { items: [] }
})

const mapEvent = ({
  out,
  id,
  timestamp,
  contract,
  eventName,
  args
}: EventMapContext<SafeDepositRouterEventsQuery>) => {
  switch (eventName) {
    case 'Deposited':
      out.safeDeposits.items.push({
        id,
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
  contractAddress: MaybeRefOrGetter<string | undefined>
) {
  return useContractEventsViaLogs<SafeDepositRouterEventsQuery>({
    contractAddress,
    queryKey: 'safe-deposit-router-events-logs',
    eventAbi: SAFE_ROUTER_EVENT_ABI,
    empty,
    mapEvent
  })
}
