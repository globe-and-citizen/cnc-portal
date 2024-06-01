import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TransferFromBankModal from '@/components/modals/TransferFromBankModal.vue'
import { NETWORK } from '@/constant'

describe('TransferFromBankModal.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(TransferFromBankModal, {
      props: { loading: false }
    })

    expect(wrapper.find('h1').text()).toBe('Transfer from Bank Contract')
    expect(wrapper.find('h3').text()).toContain(
      `This will transfer 0 ${NETWORK.currencySymbol} from the team bank contract to this address .`
    )
    expect(wrapper.find('.modal').exists()).toBe(true)
  })

  it('emits closeModal when close button is clicked', async () => {
    const wrapper = mount(TransferFromBankModal, {
      props: { loading: false }
    })

    await wrapper.find('.btn-circle').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('closeModal')
  })

  it('emits transfer with correct parameters when Transfer button is clicked', async () => {
    const wrapper = mount(TransferFromBankModal, {
      props: { loading: false }
    })

    const toInput = wrapper.find('input').element as HTMLInputElement
    toInput.value = '0x123'
    await wrapper.find('input').setValue('0x123')
    const amountInput = wrapper.findAll('input').at(1)
    await amountInput!.setValue('100')
    await wrapper.find('.btn-primary').trigger('click')

    expect(wrapper.emitted()).toHaveProperty('transfer')
    expect(wrapper.emitted('transfer')?.[0]).toEqual(['0x123', '100'])
  })

  it('shows loading button when loading is true', () => {
    const wrapper = mount(TransferFromBankModal, {
      props: { loading: true }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(true)
    expect(wrapper.find('button.btn.btn-primary').isVisible()).toBe(false)
  })

  it('shows transfer button when loading is false', () => {
    const wrapper = mount(TransferFromBankModal, {
      props: { loading: false }
    })

    expect(wrapper.findComponent({ name: 'LoadingButton' }).exists()).toBe(false)
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
  })

  it('emits closeModal when cancel button is clicked', async () => {
    const wrapper = mount(TransferFromBankModal, {
      props: { loading: false }
    })

    await wrapper.find('.btn-error').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('closeModal')
  })
})
