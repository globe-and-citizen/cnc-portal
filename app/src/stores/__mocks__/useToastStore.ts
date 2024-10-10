import { vi } from 'vitest'

export const useToastStore = vi.fn().mockReturnValue({
  addErrorToast: vi.fn(),
  addSuccessToast: vi.fn()
})
