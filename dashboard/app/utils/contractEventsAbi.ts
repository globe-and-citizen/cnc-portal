import type { AbiEvent } from 'viem'
import { contractEventsAbi as eventsV0 } from '~/artifacts/abi/V0/events'
import { contractEventsAbi as eventsV01 } from '~/artifacts/abi/V0.1/events'
import { contractEventsAbi as eventsV1 } from '~/artifacts/abi/V1/events'
import { contractEventsAbi as eventsV2 } from '~/artifacts/abi/V2/events'

// Try each generation separately: identical event signatures can have different
// indexed fields, so a single signature-deduplicated ABI cannot decode both.
// V1 retains precedence where the encoded layouts are indistinguishable.
export const EVENT_ABIS: readonly (readonly AbiEvent[])[] = [
  eventsV1, eventsV0, eventsV01, eventsV2
]
