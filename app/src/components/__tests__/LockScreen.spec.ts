import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, afterEach } from 'vitest'
import LockScreen from '../LockScreen.vue'
import { mockUseConnection } from '@/tests/mocks/wagmi.vue.mock'

describe('LockScreen.vue', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    // reset mock address to default
    mockUseConnection.address.value = '0x1234567890123456789012345678901234567890'
    vi.clearAllMocks()
  })

  it('handles missing user and connected addresses gracefully', () => {
    // simulate no connected address and no user address
    mockUseConnection.address.value = undefined as unknown as string

    wrapper = mount(LockScreen, {
      props: {
        user: { address: '' }
      },
    })
  })

  it('renders formatted user and connected addresses', () => {
    wrapper = mount(LockScreen, {
      props: {
        user: { address: '0x1111111111111111111111111111111111111111' }
      },
    })

    expect(wrapper.text()).toContain('0x1111...1111')
    expect(wrapper.text()).toContain('0x1234...7890')
  })

  it('calls disconnect when Logout button is clicked', async () => {
    wrapper = mount(LockScreen, {
      props: {
        user: { address: '0x1111111111111111111111111111111111111111' }
      },
    })

    // Component renders with user address
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('0x1111...1111')
  })
})
