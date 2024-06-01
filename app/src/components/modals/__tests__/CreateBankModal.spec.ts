import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CreateBankModal from '@/components/modals/CreateBankModal.vue'

describe('CreateBankModal.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(CreateBankModal, {
      props: { loading: false },
    })

    expect(wrapper.find('h1').text()).toBe('Create Team Bank Contract')
    expect(wrapper.find('h3').text()).toContain('By clicking "Deploy Bank Contract"')
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('emits closeModal when close button is clicked', async () => {
    const wrapper = mount(CreateBankModal, {
      props: { loading: false },
    })
    
    await wrapper.find('.btn-circle').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('closeModal')
  })

  it('emits createBank when Deploy Bank Contract button is clicked', async () => {
    const wrapper = mount(CreateBankModal, {
      props: { loading: false },
    })
    
    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('createBank')
  })

  it('shows loading button when loading is true', () => {
    const wrapper = mount(CreateBankModal, {
      props: { loading: true },
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    expect(wrapper.find('button.btn.btn-primary').isVisible()).toBe(false)
  })

  it('shows deploy button when loading is false', () => {
    const wrapper = mount(CreateBankModal, {
      props: { loading: false },
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
  })

  it('emits closeModal when cancel button is clicked', async () => {
    const wrapper = mount(CreateBankModal, {
      props: { loading: false },
    })
    
    await wrapper.find('.btn-error').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('closeModal')
  })
})
