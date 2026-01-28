import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import SafeDropdown from '../SafeSelector.vue'
import { useRouter, useRoute } from 'vue-router'
import { useTeamSafes } from '@/composables/safe'
import { ref } from 'vue'

// 1. Mock the Composables
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn()
}))

vi.mock('@/composables/safe', () => ({
  useTeamSafes: vi.fn()
}))

vi.mock('@/composables/trading', () => ({
  useUserPositions: vi.fn(() => ({ refetch: vi.fn() }))
}))

describe('SafeDropdown.vue', () => {
  const mockRouter = { push: vi.fn() }
  const mockRoute = { name: 'trading', params: { teamId: '1' }, path: '/trading/' }
  const mockSafes = [
    { address: '0x123', name: 'Safe 1', balance: '1.2' },
    { address: '0x456', name: 'Safe 2', balance: '0' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as Mock).mockReturnValue(mockRouter)
    ;(useRoute as Mock).mockReturnValue(mockRoute)
    ;(useTeamSafes as Mock).mockReturnValue({
      safes: ref(mockSafes),
      selectedSafe: ref(mockSafes[0])
    })
  })

  it('renders the selected safe name on the button', () => {
    const wrapper = mount(SafeDropdown)
    expect(wrapper.find('.font-medium').text()).toBe('Safe 1')
  })

  it('toggles the dropdown menu when clicked', async () => {
    const wrapper = mount(SafeDropdown)
    expect(wrapper.find('.menu').exists()).toBe(false)

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.menu').exists()).toBe(true)

    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.menu').exists()).toBe(false)
  })

  it('navigates to the correct route when a safe is selected', async () => {
    const wrapper = mount(SafeDropdown)
    await wrapper.find('button').trigger('click') // Open

    const secondSafeItem = wrapper.findAll('a')[1]
    await secondSafeItem?.trigger('click')

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'trading',
      params: { teamId: '1', address: '0x456' }
    })
    expect(wrapper.find('.menu').exists()).toBe(false) // Closes after selection
  })

  it('displays "No safes available" when the list is empty', async () => {
    ;(useTeamSafes as Mock).mockReturnValue({
      safes: ref([]),
      selectedSafe: ref(undefined)
    })

    const wrapper = mount(SafeDropdown)
    await wrapper.find('button').trigger('click')

    expect(wrapper.find('.disabled').text()).toContain('No safes available')
  })
})
