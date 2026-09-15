/**
 * Vesting event feed from the RPC (getLogs vs indexer), in the exact
 * `VestingEventFeed` shape, via the shared `useContractEventsViaLogs` base.
 *
 * Only the three lifecycle events the books care about are mapped:
 *   - `VestingCreated`      — a grant (agreement only, no tokens move),
 *   - `TokensReleased`      — vested shares minted to the member,
 *   - `VestingStopped`      — a schedule stopped, its unvested remainder dropped.
 */
import type { MaybeRefOrGetter } from 'vue'
import { vestingAbi as vestingV2Abi } from '@/artifacts/abi/V2/generated'
import { vestingAbi as vestingV1Abi } from '@/artifacts/abi/V1/generated'
import { vestingAbi as vestingV01Abi } from '@/artifacts/abi/V0.1/generated'
import { vestingAbi as vestingV0Abi } from '@/artifacts/abi/V0/generated'
import type { VestingEventFeed } from '@/types/contract-events/vesting'
import {
  str,
  unionEventAbi,
  useContractEventsViaLogs,
  type EventMapContext,
  type ContractAddressInput
} from '@/composables/eventsViaLogs'

const VESTING_EVENT_ABI = unionEventAbi([vestingV2Abi, vestingV1Abi, vestingV01Abi, vestingV0Abi])

const empty = (): VestingEventFeed => ({
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
}: EventMapContext<VestingEventFeed>) => {
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
  return useContractEventsViaLogs<VestingEventFeed>({
    contractAddress,
    queryKey: 'vesting-events-logs',
    eventAbi: VESTING_EVENT_ABI,
    empty,
    mapEvent
  })
}
