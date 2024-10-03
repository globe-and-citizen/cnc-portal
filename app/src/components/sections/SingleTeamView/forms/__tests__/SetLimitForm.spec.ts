import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SetLimitForm from '../SetLimitForm.vue'

describe('SetLimitForm', () => {
  interface ComponentOptions {
    props?: {}
  }

  const createComponent = ({ props = {} }: ComponentOptions = {}) => {
    return mount(SetLimitForm, {
      props: {
        loading: false,
        isBodAction: false,
        ...props
      }
    })
  }
  describe('Render', () => {
    it('should bod notification and description input if BoD action', () => {
      const wrapper = createComponent({ props: { isBodAction: true } })
      console.log(`wrapper.props`, wrapper.props())
      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="description-input"]').exists()).toBe(true)
    })
  })

  describe('Emits', () => {
    it('emits setLimitForm when submit button is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('button[data-test="transferButton"]').trigger('click')
      expect(wrapper.emitted('setLimit')).toBeTruthy()
    })
  })
})
