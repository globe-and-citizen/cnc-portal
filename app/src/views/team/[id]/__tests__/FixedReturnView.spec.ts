import { describe, it, expect, beforeEach } from 'vitest'
import { DOMWrapper, mount } from '@vue/test-utils'
import FixedReturnView from '../FixedReturnView.vue'
import { mockFixedReturnReads, mockUserStore, resetUserStoreMock } from '@/tests/mocks'

const OWNER_ADDRESS = '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886'

function mountView() {
  return mount(FixedReturnView, {
    global: { stubs: { CreateOfferingForm: true, OfferingsDashboard: true } }
  })
}

function getTab(wrapper: ReturnType<typeof mountView>, selector: string): HTMLElement {
  return wrapper.find(selector).element.closest('[role="tab"]') as HTMLElement
}

function getTabWrapper(wrapper: ReturnType<typeof mountView>, selector: string) {
  return new DOMWrapper(getTab(wrapper, selector))
}

describe('FixedReturnView.vue', () => {
  beforeEach(() => {
    resetUserStoreMock()
    mockFixedReturnReads.owner.data.value = OWNER_ADDRESS
  })

  it('defaults to showing My Offerings rather than the create form', () => {
    const wrapper = mountView()
    expect(wrapper.findComponent({ name: 'OfferingsDashboard' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CreateOfferingForm' }).exists()).toBe(false)
  })

  it('disables the Issue Note tab for a non-owner', () => {
    mockUserStore.address = '0x0000000000000000000000000000000000000002'
    const wrapper = mountView()

    expect(getTab(wrapper, '[data-test="issue-note-tab"]').hasAttribute('disabled')).toBe(true)
  })

  it('enables the Issue Note tab for the on-chain owner and switches to it on click', async () => {
    mockUserStore.address = OWNER_ADDRESS
    const wrapper = mountView()

    const tab = getTabWrapper(wrapper, '[data-test="issue-note-tab"]')
    expect(getTab(wrapper, '[data-test="issue-note-tab"]').hasAttribute('disabled')).toBe(false)

    await tab.trigger('mousedown', { button: 0, ctrlKey: false })
    expect(wrapper.findComponent({ name: 'CreateOfferingForm' }).exists()).toBe(true)
  })

  it('switches back to My Offerings when the create form emits close', async () => {
    mockUserStore.address = OWNER_ADDRESS
    const wrapper = mountView()
    await getTabWrapper(wrapper, '[data-test="issue-note-tab"]').trigger('mousedown', {
      button: 0,
      ctrlKey: false
    })

    await wrapper.findComponent({ name: 'CreateOfferingForm' }).vm.$emit('close')

    expect(wrapper.findComponent({ name: 'OfferingsDashboard' }).exists()).toBe(true)
  })

  it('marks the active tab with aria-selected', async () => {
    mockUserStore.address = OWNER_ADDRESS
    const wrapper = mountView()

    expect(getTab(wrapper, '[data-test="my-offerings-tab"]').getAttribute('aria-selected')).toBe(
      'true'
    )
    expect(getTab(wrapper, '[data-test="issue-note-tab"]').getAttribute('aria-selected')).toBe(
      'false'
    )

    await getTabWrapper(wrapper, '[data-test="issue-note-tab"]').trigger('mousedown', {
      button: 0,
      ctrlKey: false
    })

    expect(getTab(wrapper, '[data-test="my-offerings-tab"]').getAttribute('aria-selected')).toBe(
      'false'
    )
    expect(getTab(wrapper, '[data-test="issue-note-tab"]').getAttribute('aria-selected')).toBe(
      'true'
    )
  })

  it('marks the tab group with role="tablist" and each tab with role="tab"', () => {
    const wrapper = mountView()
    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(2)
  })
})
