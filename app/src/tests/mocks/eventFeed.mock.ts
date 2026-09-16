import { ref, type Ref } from 'vue'
import type { ScanResult } from '@/composables/eventsViaLogs'

export type MockEventFeedState<T = unknown> = {
  data: Ref<ScanResult<T> | undefined>
  error: Ref<Error | null>
  isPending: Ref<boolean>
}

export const createMockEventFeedState = <T = unknown>(
  initialResult?: T
): MockEventFeedState<T> => ({
  data: ref(
    initialResult === undefined ? undefined : { events: initialResult, gaps: [], timestampGaps: [] }
  ) as Ref<ScanResult<T> | undefined>,
  error: ref<Error | null>(null),
  isPending: ref(false)
})

export const resetMockEventFeedState = <T = unknown>(state: MockEventFeedState<T>, result?: T) => {
  state.data.value =
    result === undefined ? undefined : { events: result, gaps: [], timestampGaps: [] }
  state.error.value = null
  state.isPending.value = false
}
