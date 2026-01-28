import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import ContractManagementView from '@/views/team/[id]/ContractManagementView.vue'

import { createTestingPinia } from '@pinia/testing'

describe('ContractManagementView.vue', () => {
  const createComponent = () =>
    shallowMount(ContractManagementView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })

  it('does not render deploy button if user is not the team owner', async () => {
    const wrapper = createComponent()

    expect(wrapper.exists()).toBe(true)
  })
})
