import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CompanyActionConfirm from '../CompanyActionConfirm.vue'

const mountConfirm = (props: Record<string, unknown> = {}) =>
  mount(CompanyActionConfirm, {
    props: { open: true, kind: 'archive', teamName: 'Acme', ...props }
  })

describe('CompanyActionConfirm', () => {
  it('renders the archive copy with the company name', () => {
    const wrapper = mountConfirm({ kind: 'archive' })
    expect(wrapper.find('[data-test="company-action-confirm"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="company-action-cancel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Acme')
    expect(wrapper.text()).toContain('archive')
  })

  it('renders the delete copy', () => {
    const wrapper = mountConfirm({ kind: 'delete' })
    expect(wrapper.text()).toContain('delete')
  })

  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mountConfirm()
    await wrapper.find('[data-test="company-action-confirm"]').trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('requests close when cancel is clicked', async () => {
    const wrapper = mountConfirm()
    await wrapper.find('[data-test="company-action-cancel"]').trigger('click')
    expect(wrapper.emitted('update:open')?.at(-1)?.[0]).toBe(false)
  })

  it('surfaces an error message when provided', () => {
    const wrapper = mountConfirm({ errorMessage: 'Boom' })
    expect(wrapper.find('[data-test="company-action-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Boom')
  })
})
