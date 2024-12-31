import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SetLimitForm from '../SetLimitForm.vue'

interface ComponentData {
  amount: string
  description: string
}

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
    it('should show bod notification and description input if BoD action', () => {
      const wrapper = createComponent({ props: { isBodAction: true } })
      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="description-input"]').exists()).toBe(true)
    })

    it('should not show bod notification and description input if not BoD action', () => {
      const wrapper = createComponent({ props: { isBodAction: false } })
      expect(wrapper.find('[data-test="bod-notification"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="description-input"]').exists()).toBe(false)
    })
  })

  describe('Validation', () => {
    it('should show error when amount is not a number', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).amount = 'not-a-number'
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transferButton"]').trigger('click')
      expect(wrapper.text()).toContain('must be numericAmount')
    })

    it('should show error when amount is zero', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).amount = '0'
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transferButton"]').trigger('click')
      expect(wrapper.text()).toContain('Amount must be greater than 0')
    })

    it('should show error when description is required but empty', async () => {
      const wrapper = createComponent({ props: { isBodAction: true } })
      ;(wrapper.vm as unknown as ComponentData).amount = '1'
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transferButton"]').trigger('click')
      expect(wrapper.text()).toContain('Description is required')
    })
  })

  describe('Emits', () => {
    it('emits setLimit when form is valid', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).amount = '0.20'
      ;(wrapper.vm as unknown as ComponentData).description = 'Test description'
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transferButton"]').trigger('click')
      expect(wrapper.emitted('setLimit')).toBeTruthy()
      expect(wrapper.emitted('setLimit')?.[0]).toEqual(['0.20', 'Test description'])
    })

    it('emits closeModal when cancel button is clicked', async () => {
      const wrapper = createComponent()
      await wrapper.find('button:last-child').trigger('click')
      expect(wrapper.emitted('closeModal')).toBeTruthy()
    })

    it('should not emit setLimit when form is invalid', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).amount = '0'
      await wrapper.vm.$nextTick()
      await wrapper.find('[data-test="transferButton"]').trigger('click')
      expect(wrapper.emitted('setLimit')).toBeFalsy()
    })
  })
})
