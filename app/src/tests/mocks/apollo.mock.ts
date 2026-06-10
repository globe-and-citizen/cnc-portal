import { ref, type Ref } from 'vue'

export type MockApolloQueryState<T = unknown> = {
  result: Ref<T | undefined>
  error: Ref<Error | null>
  loading: Ref<boolean>
}

type UseQueryMock = {
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => unknown
  mockReturnValue: (value: unknown) => unknown
}

export const createMockApolloQueryState = <T = unknown>(
  initialResult?: T
): MockApolloQueryState<T> => ({
  result: ref(initialResult) as Ref<T | undefined>,
  error: ref<Error | null>(null),
  loading: ref(false)
})

export const resetMockApolloQueryState = <T = unknown>(
  state: MockApolloQueryState<T>,
  result?: T
) => {
  state.result.value = result
  state.error.value = null
  state.loading.value = false
}

export const mockApolloUseQuery = <T = unknown>(
  useQueryMock: UseQueryMock,
  state: MockApolloQueryState<T>
) => {
  useQueryMock.mockReturnValue(state)
}

export const mockApolloUseQueryByVariableKey = (
  useQueryMock: UseQueryMock,
  fallbackState: MockApolloQueryState,
  routes: Record<string, MockApolloQueryState>
) => {
  useQueryMock.mockImplementation((_document, variables) => {
    const variableKeys = variables && typeof variables === 'object' ? Object.keys(variables) : []
    const routeKey = variableKeys.find((key) => key in routes)

    return routeKey ? routes[routeKey] : fallbackState
  })
}
