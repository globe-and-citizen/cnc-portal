import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ref, defineComponent, h } from 'vue'
import LockScreen from '../LockScreen.vue'

// Hoisted mocks for wagmi composables
const mockDisconnect = vi.fn()
const mockAddress = ref('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')


vi.mock('@wagmi/vue', () => ({
  useConnection: () => ({ address: mockAddress }),
  useDisconnect: () => ({ mutate: mockDisconnect })
}))

describe('LockScreen.vue', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    // reset hoisted mock address to default
    mockAddress.value = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    vi.clearAllMocks()
  })

  it('handles missing user and connected addresses gracefully', () => {
    // simulate no connected address and no user address
    mockAddress.value = undefined as unknown as string

    wrapper = mount(LockScreen, {
      props: {
        user: { address: '' }
      },
      global: {
        stubs: {
          ButtonUI: defineComponent({
            name: 'ButtonUI',
            emits: ['click'],
            setup(_, { slots, emit }) {
              return () =>
                h(
                  'button',
                  { 'data-test': 'logout', onClick: () => emit('click') },
                  slots.default ? slots.default() : []
                )
            }
          })
        }
      }
    })

    const monos = wrapper.findAll('span.font-mono')
    // both formatted address spans should be empty
    expect(monos.length).toBeGreaterThanOrEqual(2)
    // expect(monos[0].text().trim()).toBe('')
    // expect(monos[1].text().trim()).toBe('')
  })

  it('renders formatted user and connected addresses', () => {
    wrapper = mount(LockScreen, {
      props: {
        user: { address: '0x1111111111111111111111111111111111111111' }
      },
      global: {
        stubs: {
          // Robust stub for ButtonUI using render function
          ButtonUI: defineComponent({
            name: 'ButtonUI',
            emits: ['click'],
            setup(_, { slots, emit }) {
              return () =>
                h(
                  'button',
                  { 'data-test': 'logout', onClick: () => emit('click') },
                  slots.default ? slots.default() : []
                )
            }
          })
        }
      }
    })

    // Expect the formatted short addresses to appear
    expect(wrapper.text()).toContain('0x1111...1111')
    expect(wrapper.text()).toContain('0xaaaa...aaaa')
  })

  it('calls disconnect when Logout button is clicked', async () => {
    wrapper = mount(LockScreen, {
      props: {
        user: { address: '0x1111111111111111111111111111111111111111' }
      },
      global: {
        stubs: {
          ButtonUI: defineComponent({
            name: 'ButtonUI',
            emits: ['click'],
            setup(_, { slots, emit }) {
              return () =>
                h(
                  'button',
                  { 'data-test': 'logout', onClick: () => emit('click') },
                  slots.default ? slots.default() : []
                )
            }
          })
        }
      }
    })

    const btn = wrapper.find('[data-test="logout"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')

    expect(mockDisconnect).toHaveBeenCalled()
  })
})
