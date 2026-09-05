import { ref, type Ref } from 'vue'

export type MockEventFeedState<T = unknown> = {
  result: Ref<T | undefined>
  error: Ref<Error | null>
  loading: Ref<boolean>
}

export const createMockEventFeedState = <T = unknown>(
  initialResult?: T
): MockEventFeedState<T> => ({
  result: ref(initialResult) as Ref<T | undefined>,
  error: ref<Error | null>(null),
  loading: ref(false)
})

export const resetMockEventFeedState = <T = unknown>(state: MockEventFeedState<T>, result?: T) => {
  state.result.value = result
  state.error.value = null
  state.loading.value = false
}
