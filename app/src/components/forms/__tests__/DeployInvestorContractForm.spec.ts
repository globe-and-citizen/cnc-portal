import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DeployInvestorContractForm from '../DeployInvestorContractForm.vue'
import ButtonUI from '@/components/ButtonUI.vue'

describe('DeployInvestorContractForm.vue', () => {
  it('adds the title (Deploy all) if isDeployAll is true', () => {
    const wrapper = shallowMount(DeployInvestorContractForm, {
      props: {
        loading: false,
        isDeployAll: true
      }
    })
    expect(wrapper.find('h3[data-test="title"]').text()).toEqual(
      'Deploy Investor Contract (Deploy all)'
    )
  })

  it('should render name input', async () => {
    const wrapper = shallowMount(DeployInvestorContractForm, {
      props: {
        loading: false,
        isDeployAll: false
      }
    })
    const input = wrapper.find('input[data-test="name-input"]')
    expect(input.exists()).toBeTruthy()

    await input.setValue('Bitcoin')
    expect(wrapper.vm.name).toBe('Bitcoin')
  })

  it('should render symbol input', () => {
    const wrapper = shallowMount(DeployInvestorContractForm, {
      props: {
        loading: false,
        isDeployAll: false
      }
    })
    const input = wrapper.find('input[data-test="symbol-input"]')
    expect(input.exists()).toBeTruthy()

    input.setValue('BTC')
    expect(wrapper.vm.symbol).toBe('BTC')
  })

  it('should render loading button if loading is true', () => {
    const wrapper = shallowMount(DeployInvestorContractForm, {
      props: {
        loading: true,
        isDeployAll: false
      }
    })
    expect(wrapper.findComponent(ButtonUI).props().loading).toBe(true)
  })

  it('should show error message if name is empty', async () => {
    const wrapper = shallowMount(DeployInvestorContractForm, {
      props: {
        loading: false,
        isDeployAll: false
      }
    })
    const button = wrapper.findComponent(ButtonUI)
    await button.trigger('click')

    const nameError = wrapper.find('div[data-test="name-error"]')
    expect(nameError.exists()).toBeTruthy()
  })

  it('should show error message if symbol is empty', async () => {
    const wrapper = shallowMount(DeployInvestorContractForm, {
      props: {
        loading: false,
        isDeployAll: false
      }
    })
    const button = wrapper.findComponent(ButtonUI)
    await button.trigger('click')

    const symbolError = wrapper.find('div[data-test="symbol-error"]')
    expect(symbolError.exists()).toBeTruthy()
  })

  it('should emit submit event when button is clicked', async () => {
    const wrapper = shallowMount(DeployInvestorContractForm, {
      props: {
        loading: false,
        isDeployAll: false
      }
    })
    const nameInput = wrapper.find('input[data-test="name-input"]')
    await nameInput.setValue('Bitcoin')
    const symbolInput = wrapper.find('input[data-test="symbol-input"]')
    await symbolInput.setValue('BTC')

    const button = wrapper.findComponent(ButtonUI)
    await button.trigger('click')
    expect(wrapper.emitted('submit')).toBeTruthy()
  })
})
