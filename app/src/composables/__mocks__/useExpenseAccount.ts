import { vi } from 'vitest'
import { ref } from 'vue'

export const useExpenseGetFunction = vi.fn().mockReturnValue({
  execute: vi.fn(),
  data: ref<string | undefined>(),
  args: ref<string[] | undefined>([]),
  inputs: ref<string[] | undefined>([])
})
