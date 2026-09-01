/**
 * Vesting event feed from the RPC (getLogs vs indexer), in the exact
 * `VestingEventsQuery` shape, via the shared `useContractEventsViaLogs` base.
 *
 * Only the three lifecycle events the books care about are mapped:
 *   - `VestingCreated`      — a grant (agreement only, no tokens move),
 *   - `TokensReleased`      — vested shares minted to the member,
 *   - `VestingStopped`      — a schedule stopped, its unvested remainder dropped.
 */
import type { MaybeRefOrGetter } from 'vue'
import VestingV2abi from '@/artifacts/abi/V2/json/Vesting.json'
import VestingV1abi from '@/artifacts/abi/V1/json/Vesting.json'
import VestingV01abi from '@/artifacts/abi/V0.1/json/Vesting.json'
import VestingV0abi from '@/artifacts/abi/V0/json/Vesting.json'
import type { VestingEventsQuery } from '@/types/ponder/vesting'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext,
  type ContractAddressInput
} from '@/composables/eventsViaLogs'

const VESTING_EVENT_ABI = unionEventAbi([VestingV2abi, VestingV1abi, VestingV01abi, VestingV0abi])

const empty = (): VestingEventsQuery => ({
  vestingCreateds: { items: [] },
  vestingTokensReleaseds: { items: [] },
  vestingStoppeds: { items: [] }
})

const mapEvent = ({
  out,
  id,
  timestamp,
  contract,
  eventName,
  args
}: EventMapContext<VestingEventsQuery>) => {
  switch (eventName) {
    case 'VestingCreated':
      out.vestingCreateds.items.push({
        id,
        contractAddress: contract,
        member: args.member,
        scheduleIndex: str(args.index),
        amount: str(args.amount),
        timestamp
      })
      break
    case 'TokensReleased':
      out.vestingTokensReleaseds.items.push({
        id,
        contractAddress: contract,
        member: args.member,
        scheduleIndex: str(args.index),
        amount: str(args.amount),
        timestamp
      })
      break
    case 'VestingStopped':
      out.vestingStoppeds.items.push({
        id,
        contractAddress: contract,
        member: args.member,
        scheduleIndex: str(args.index),
        timestamp
      })
      break
  }
}

export function useVestingEventsViaLogs(contractAddress: MaybeRefOrGetter<ContractAddressInput>) {
  return useContractEventsViaLogs<VestingEventsQuery>({
    contractAddress,
    queryKey: 'vesting-events-logs',
    eventAbi: VESTING_EVENT_ABI,
    empty,
    mapEvent
  })
}
