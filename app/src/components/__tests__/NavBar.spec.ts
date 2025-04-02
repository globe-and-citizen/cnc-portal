import { describe, expect, it, vi } from 'vitest'

import NavBar from '@/components/NavBar.vue'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false)
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt)
  }
})

describe('NavBar', () => {
  const props = {
    isCollapsed: false
  }
  const wrapper = mount(NavBar, {
    props,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })]
    }
  })

  // Check if the component is rendered properly
  describe('Render', () => {
    it('Should Render the component', () => {
      expect(wrapper.exists()).toBe(true)
    })
  })

  // Check if the component emits the right events
  describe('Emits', () => {
    it('Should emits toggleEditUserModal event when Profile is clicked', async () => {
      await wrapper.find('[data-test="toggleEditUser"]').trigger('click')
      expect(wrapper.emitted('toggleEditUserModal')).toBeTruthy()
    })
  })

  it('Should logout the user', async () => {
    await wrapper.find('[data-test="logout"]').trigger('click')
    // TODO: check a user is connected, then check if he is logged out
  })
  // TODO: click on logout
})
