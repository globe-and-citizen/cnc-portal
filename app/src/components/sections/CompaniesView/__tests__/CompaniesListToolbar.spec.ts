import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CompaniesListToolbar from '@/components/sections/CompaniesView/CompaniesListToolbar.vue'
import { mockRouterReplace } from '@/tests/mocks'
import { useRoute } from 'vue-router'

const counts = { all: 5, owner: 3, employee: 2 }

const mountToolbar = (overrides: Record<string, unknown> = {}) =>
  mount(CompaniesListToolbar, {
    props: {
      title: 'Companies',
      counts,
      role: 'all',
      query: '',
      showHidden: false,
      showArchived: false,
      view: 'cards',
      ...overrides
    },
    global: { stubs: { AddTeamForm: true } }
  })

describe('CompaniesListToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useRoute).mockReturnValue({
      params: {},
      meta: {},
      query: {}
    } as unknown as ReturnType<typeof useRoute>)
  })

  it('renders the title, role counts and controls', () => {
    const wrapper = mountToolbar()
    expect(wrapper.find('h2').text()).toContain('Companies')
    expect(wrapper.find('[data-test="role-option-all"]').text()).toContain('5')
    expect(wrapper.find('[data-test="role-option-owner"]').text()).toContain('3')
    expect(wrapper.find('[data-test="role-option-employee"]').text()).toContain('2')
    expect(wrapper.find('[data-test="search-companies"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="view-toggle-table"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="create-company-button"]').exists()).toBe(true)
  })

  it('emits role and view updates from the segmented controls', async () => {
    const wrapper = mountToolbar()
    await wrapper.find('[data-test="role-option-owner"]').trigger('click')
    expect(wrapper.emitted('update:role')?.at(-1)).toEqual(['owner'])
    await wrapper.find('[data-test="view-toggle-table"]').trigger('click')
    expect(wrapper.emitted('update:view')?.at(-1)).toEqual(['table'])
  })

  it('shows the active-filter badge and resets visibility', async () => {
    const wrapper = mountToolbar({ showHidden: true })
    expect(wrapper.find('[data-test="filters-count-badge"]').text()).toContain('1')
    await wrapper.find('[data-test="reset-visibility"]').trigger('click')
    expect(wrapper.emitted('update:showHidden')?.at(-1)).toEqual([false])
  })

  it('opens the create modal on click', async () => {
    const wrapper = mountToolbar()
    await wrapper.find('[data-test="create-company-button"]').trigger('click')
    // the global UModal stub renders its body (with the close button) when open
    expect(wrapper.find('[data-test="close-wage-modal-button"]').exists()).toBe(true)
  })

  it('auto-opens the create modal and clears ?create=1 on a deep link', () => {
    vi.mocked(useRoute).mockReturnValue({
      params: {},
      meta: {},
      query: { create: '1' }
    } as unknown as ReturnType<typeof useRoute>)
    const wrapper = mountToolbar()
    expect(wrapper.find('[data-test="close-wage-modal-button"]').exists()).toBe(true)
    expect(mockRouterReplace).toHaveBeenCalledWith({ query: {} })
  })
})
