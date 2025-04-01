import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DescriptionActionForm from '../DescriptionActionForm.vue'

interface ComponentData {
  description: string
}

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
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.text()).toContain('Value is required')
    })

    it('should show error when description is too short', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).description = 'abc'
      await wrapper.vm.$nextTick()
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.text()).toContain('This field should be at least 5 characters long')
    })
  })

  describe('Emits', () => {
    it('should emit submit with description when form is valid', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).description = 'Valid description'
      await wrapper.vm.$nextTick()
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')?.[0]).toEqual(['Valid description'])
    })

    it('should not emit submit when form is invalid', async () => {
      const wrapper = createComponent()
      ;(wrapper.vm as unknown as ComponentData).description = 'abc'
      await wrapper.vm.$nextTick()
      await wrapper.find('.btn-primary').trigger('click')
      expect(wrapper.emitted('submit')).toBeFalsy()
    })
  })
})
