import type { EventResult } from '@/types'
import { vi } from 'vitest'
import { ref } from 'vue'

export const useTipEvents = vi.fn().mockReturnValue({
  events: ref<EventResult[]>([]),
  getEvents: vi.fn(),
  loading: ref(false),
  error: ref(null)
})
