import { vi } from 'vitest'
import { ref } from 'vue'

export const useGetActionCount = vi.fn().mockReturnValue({
  execute: vi.fn(),
  loading: ref(false),
  error: ref(null),
  data: ref(0)
})

export const useApproveAction = vi.fn().mockReturnValue({
  execute: vi.fn(),
  isLoading: ref(false),
  error: ref(null),
  isSuccess: ref(false)
})

export const useRevokeAction = vi.fn().mockReturnValue({
  execute: vi.fn(),
  isLoading: ref(false),
  error: ref(null),
  isSuccess: ref(false)
})

export const useApprovalCount = vi.fn().mockReturnValue({
  execute: vi.fn(),
  isLoading: ref(false),
  error: ref(null),
  data: ref(0)
})

export const useActionExecuted = vi.fn().mockReturnValue({
  execute: vi.fn(),
  loading: ref(false),
  error: ref(null),
  data: ref(false)
})
