import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TokenSelector from '@/components/TokenDropdown.vue'
import { Icon as IconifyIcon } from '@iconify/vue'

// Mock the NETWORK constant
vi.mock('@/constant', () => ({
  NETWORK: {
    currencySymbol: 'SepoliaETH'
  }
}))

describe('TokenSelector', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(TokenSelector, {
      global: {
        components: {
          IconifyIcon
        }
      }
    })
  })

  it('renders correctly with default props', () => {
    expect(wrapper.find('[data-test="token-selector"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="token-selector"]').text()).toContain('SepETH')
    expect(wrapper.find('[data-test="token-dropdown"]').exists()).toBe(false)
  })

  it('displays the dropdown when clicked', async () => {
    await wrapper.find('[data-test="token-selector"]').trigger('click')
    expect(wrapper.find('[data-test="token-dropdown"]').exists()).toBe(true)
  })

  it('does not open dropdown when disabled', async () => {
    const disabledWrapper = mount(TokenSelector, {
      props: {
        disabled: true
      },
      global: {
        components: {
          IconifyIcon
        }
      }
    })

    await disabledWrapper.find('[data-test="token-selector"]').trigger('click')
    expect(disabledWrapper.find('[data-test="token-dropdown"]').exists()).toBe(false)
  })

  it('displays correct token options in dropdown', async () => {
    await wrapper.find('[data-test="token-selector"]').trigger('click')
    const options = wrapper.findAll('[data-test="token-dropdown"] li')
    expect(options.length).toBe(3)
    expect(options[0].text()).toBe('SepoliaETH')
    expect(options[1].text()).toBe('USDC')
    expect(options[2].text()).toBe('SHER')
  })

  it('emits tokenSelected event when an option is clicked', async () => {
    await wrapper.find('[data-test="token-selector"]').trigger('click')
    const options = wrapper.findAll('[data-test="token-dropdown"] li')
    await options[1].trigger('click') // Click USDC

    expect(wrapper.emitted()).toHaveProperty('tokenSelected')
    expect(wrapper.emitted().tokenSelected[0]).toEqual(['USDC'])
    expect(wrapper.find('[data-test="token-dropdown"]').exists()).toBe(false)
  })

  it('formats SepoliaETH to SepETH in display', () => {
    expect(wrapper.find('[data-test="token-selector"]').text()).toContain('SepETH')
  })

  it('shows chevron icon only when not disabled', () => {
    expect(wrapper.findComponent(IconifyIcon).exists()).toBe(true)

    const disabledWrapper = mount(TokenSelector, {
      props: {
        disabled: true
      },
      global: {
        components: {
          IconifyIcon
        }
      }
    })

    expect(disabledWrapper.findComponent(IconifyIcon).exists()).toBe(false)
  })
})
