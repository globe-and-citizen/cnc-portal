import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DescriptionActionForm from '../DescriptionActionForm.vue'

describe('DescriptionActionForm', () => {
  interface ComponentOptions {
    props?: {}
  }

  const createComponent = ({ props = {} }: ComponentOptions = {}) => {
    return mount(DescriptionActionForm, {
      props: {
        actionName: 'Test Action',
        loading: false,
        ...props
      }
    })
  }

  describe('Render', () => {
    it('should render with correct action name', () => {
      const wrapper = createComponent({ props: { actionName: 'Custom Action' } })
      expect(wrapper.text()).toContain('Custom Action')
    })
  })

  describe('Validation', () => {
    it('should show error when description is empty', async () => {
      const wrapper = createComponent()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.text()).toContain('Description must be at least 5 characters')
    })

    it('should show error when description is too short', async () => {
      const wrapper = createComponent()
      const input = wrapper.find('input[type="text"]')
      await input.setValue('abc')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.text()).toContain('Description must be at least 5 characters')
    })
  })

  describe('Emits', () => {
    it('should emit submit with description when form is valid', async () => {
      const wrapper = createComponent()
      const input = wrapper.find('input[type="text"]')
      await input.setValue('Valid description')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')?.[0]).toEqual(['Valid description'])
    })

    it('should not emit submit when form is invalid', async () => {
      const wrapper = createComponent()
      const input = wrapper.find('input[type="text"]')
      await input.setValue('abc')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.emitted('submit')).toBeFalsy()
    })
  })
})
