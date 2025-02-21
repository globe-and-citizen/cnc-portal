import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CashRemunerationView from '@/views/team/[id]/CashRemunerationView.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

vi.mock('@/stores/useToastStore')
vi.mock('vue-router', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useRoute: vi.fn(() => ({
      params: {
        id: '1'
      }
    })),
    useRouter: vi.fn(() => ({
      push: vi.fn()
    }))
  }
})
vi.mock('@/composables/useClaim', () => {
  return {
    useSignWageClaim: vi.fn(() => ({
      execute: vi.fn(),
      isLoading: ref(false),
      signature: ref(undefined)
    })),
    useWithdrawClaim: vi.fn(() => ({
      execute: vi.fn(),
      isLoading: ref(false),
      isSuccess: ref(false),
      error: ref(undefined)
    }))
  }
})

describe('CashRemunerationView.vue', () => {
  const createComponent = () => {
    return mount(CashRemunerationView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }
  it('should be able to do something', async () => {
    const wrapper = createComponent()

    const input = wrapper.find('input[data-test="hours-worked-input"')
    await input.setValue('10')

    expect((input.element as HTMLInputElement).value).toBe('10')
  })
})
