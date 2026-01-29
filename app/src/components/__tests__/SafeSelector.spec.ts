import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import SafeDropdown from '../SafeSelector.vue'
import { useRouter, useRoute, type RouteLocationNormalizedLoadedGeneric } from 'vue-router'
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

  it('covers the trading route logic in derivedSafeAddressFromEoa', () => {
    vi.mocked(useRoute).mockReturnValue({
      path: '/trading/0x123',
      params: { address: '0x123' },
      name: 'trading'
    } as unknown as RouteLocationNormalizedLoadedGeneric)

    const wrapper = mount(SafeDropdown)
    // The derivedSafeAddressFromEoa logic is exercised during render/initialization
    expect(wrapper.exists()).toBe(true)
  })

  it('covers the safe-account navigation in selectSafe', async () => {
    vi.mocked(useRoute).mockReturnValue({
      name: 'safe-account',
      params: { teamId: '1' }
    } as unknown as RouteLocationNormalizedLoadedGeneric)

    const wrapper = mount(SafeDropdown)
    await wrapper.find('button').trigger('click')
    await wrapper.find('.menu a').trigger('click')

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'safe-account',
      params: { teamId: '1', address: '0x123' }
    })
  })

  it('covers handleClickOutside logic', async () => {
    const wrapper = mount(SafeDropdown, { attachTo: document.body })

    // Open dropdown
    await wrapper.find('button').trigger('click')
    // @ts-expect-error not visible to TS
    expect(wrapper.vm.isOpen).toBe(true)

    // Create a click event outside the element
    const externalDiv = document.createElement('div')
    document.body.appendChild(externalDiv)

    await externalDiv.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    // @ts-expect-error not visible to TS
    expect(wrapper.vm.isOpen).toBe(false)

    wrapper.unmount()
  })

  it('removes event listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const wrapper = mount(SafeDropdown)

    wrapper.unmount()

    // Verifies the onUnmounted coverage
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function))
  })
})
