import { ref, type Ref } from 'vue'

export type MockEventFeedState<T = unknown> = {
  result: Ref<T | undefined>
  error: Ref<Error | null>
  gaps: Ref<unknown[]>
  timestampGaps: Ref<unknown[]>
  loading: Ref<boolean>
}

export const createMockEventFeedState = <T = unknown>(
  initialResult?: T
): MockEventFeedState<T> => ({
  result: ref(initialResult) as Ref<T | undefined>,
  error: ref<Error | null>(null),
  gaps: ref([]),
  timestampGaps: ref([]),
  loading: ref(false)
})

export const resetMockEventFeedState = <T = unknown>(state: MockEventFeedState<T>, result?: T) => {
  state.result.value = result
  state.error.value = null
  state.gaps.value = []
  state.timestampGaps.value = []
  state.loading.value = false
}
