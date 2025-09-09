import { vi } from 'vitest'
import { ref } from 'vue'

vi.mock('@tanstack/vue-query', async () => {
  const actual: object = await vi.importActual('@tanstack/vue-query')
  return {
    ...actual,
    useQueryClient: vi.fn(() => {
      return {
        invalidateQueries: vi.fn()
      }
    })
  }
})

vi.mock('@/composables', async () => {
  const actual: object = await vi.importActual('@/composables')
  return {
    ...actual,
    useTanstackQuery: vi.fn(() => {
      return {
        data: ref([]),
        isLoading: ref(false)
      }
    })
  }
})
