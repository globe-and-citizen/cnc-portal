import { it, describe, expect, beforeEach } from 'vitest'
import { VueWrapper, mount } from '@vue/test-utils'
import AccordionComponent from '@/components/AccordionComponent.vue'
import { h } from 'vue'

describe('AccordionComponent', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mount(AccordionComponent, {
      props: {
        accordions: ['Accordion 1', 'Accordion 2', 'Accordion 3'],
        modelValue: 0
      },
      slots: {
        'accordion-0': h('h1', {}, 'Accordion 1'),
        'accordion-1': h('h1', {}, 'Accordion 2'),
        'accordion-2': h('h1', {}, 'Accordion 3')
      }
    })
  })

  describe('Render', () => {
    it('renders correctly', () => {
      expect(wrapper.findAll('div.collapse.collapse-arrow.bg-base-200').length).toEqual(3)
      expect(wrapper.findAll('input[type="radio"]').length).toEqual(3)
    })

    it('renders correctly based on props', async () => {
      let currentProps = ['Accordion 1', 'Accordion 2', 'Accordion 3']

      expect(wrapper.find('input[type="radio"]:checked').attributes('name')).toEqual('accordion-0')
      wrapper
        .findAll('div.collapse-title.text-xl.font-medium')
        .forEach((el, index) => expect(el.text()).toEqual(currentProps[index]))

      currentProps = ['Accordion 2', 'Accordion 3']
      await wrapper.setProps({ accordions: currentProps, modelValue: 1 })

      expect(wrapper.find('input[type="radio"]:checked').attributes('name')).toEqual('accordion-1')
      wrapper
        .findAll('div.collapse-title.text-xl.font-medium')
        .forEach((el, index) => expect(el.text()).toEqual(currentProps[index]))
    })

    it('renders slots correctly', () => {
      expect(wrapper.findAll('h1').length).toBe(3)
    })
  })

  describe('Emits', () => {
    it('emits update:modelValue', async () => {
      await wrapper.find('input[data-test="accordion-radio-1"]').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toEqual([[1]])
    })

    it('only renders selected accordion', async () => {
      const checkedIndex = 1
      await wrapper.find(`input[data-test="accordion-radio-${checkedIndex}"]`).trigger('click')

      wrapper.findAll('input[data-test^="accordion-radio-"]').forEach((el, index) => {
        expect((el.element as HTMLInputElement).checked).toEqual(index === checkedIndex)
      })
    })
  })
})
