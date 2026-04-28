import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CashRemunerationView from '../Accounts/CashRemunerationView.vue'
import { createTestingPinia } from '@pinia/testing'
import { mockTeamStore } from '@/tests/mocks'

describe('CashRemunerationView.vue', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  const originalTeamMeta = mockTeamStore.currentTeamMeta

  afterEach(() => {
    mockTeamStore.currentTeamMeta = originalTeamMeta
  })

  it('should pass correct props to GenericTokenHoldingsSection', () => {
    const wrapper = createComponent()
    const genericTokenHoldingSection = wrapper.findComponent({
      name: 'GenericTokenHoldingsSection'
    })

    expect(genericTokenHoldingSection.exists()).toBeTruthy()
    expect(genericTokenHoldingSection.props('address')).toBe(
      '0x6666666666666666666666666666666666666666'
    )
  })

  it('should render CashRemunerationOverview component', () => {
    const wrapper = createComponent()
    const overview = wrapper.findComponent({ name: 'CashRemunerationOverview' })

    expect(overview.exists()).toBeTruthy()
  })

  it('hides the migration banner when the team is migrated', () => {
    const wrapper = createComponent()
    expect(wrapper.find('[data-test="cash-remuneration-migration-banner"]').exists()).toBe(false)
  })

  it('shows the migration banner when the team is not migrated (issue #1825)', () => {
    mockTeamStore.currentTeamMeta = {
      isPending: false,
      data: { ...originalTeamMeta.data, isMigrated: false }
    } as typeof mockTeamStore.currentTeamMeta

    const wrapper = createComponent()
    expect(wrapper.find('[data-test="cash-remuneration-migration-banner"]').exists()).toBe(true)
  })
})
