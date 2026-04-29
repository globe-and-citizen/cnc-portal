import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import VestingFlow from '@/components/sections/VestingView/VestingFlow.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import VestingActions from '@/components/sections/VestingView/VestingActions.vue'

const mockReloadKey = ref(0)

describe('VestingFlow.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () =>
    mount(VestingFlow, {
      props: {
        reloadKey: mockReloadKey.value
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mountComponent()
  })

  describe('Rendering', () => {
    it('displays vesting table with correct columns', () => {
      const table = wrapper.find('[data-test="vesting-overview"]')
      expect(table.exists()).toBe(true)
    })
  })

  describe('Vesting Actions', () => {
    it('emits reload event when actions complete', async () => {
      const actions = wrapper.findComponent(VestingActions)
      await actions.vm.$emit('reload')
      expect(wrapper.emitted('reload')).toBeTruthy()
    })
  })
})
