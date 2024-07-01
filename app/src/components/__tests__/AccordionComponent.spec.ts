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
})
