import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ButtonUI, { type IButtonType, type ISize, type IButtonShape } from '../ButtonUI.vue'

describe('ButtonUI', () => {
  describe('Button Sizes', () => {
    const sizes: ISize[] = ['xs', 'sm', 'md', 'lg']

    sizes.forEach((size) => {
      it(`should apply ${size} size class`, () => {
        const wrapper = mount(ButtonUI, { props: { size } })
        expect(wrapper.find('button').classes()).toContain(`btn-${size}`)
      })
    })
  })

  describe('Button Variants', () => {
    const variants: IButtonType[] = [
      'primary',
      'secondary',
      'accent',
      'neutral',
      'info',
      'success',
      'warning',
      'error',
      'ghost',
      'link',
      'glass'
    ]

    variants.forEach((variant) => {
      it(`should apply ${variant} variant class`, () => {
        const wrapper = mount(ButtonUI, { props: { variant } })
        expect(wrapper.find('button').classes()).toContain(`btn-${variant}`)
      })
    })
  })

  describe('Button Shapes', () => {
    it('should apply circle shape class', () => {
      const wrapper = mount(ButtonUI, { props: { shape: 'circle' as IButtonShape } })
      expect(wrapper.find('button').classes()).toContain('btn-circle')
    })
  })

  describe('Button States', () => {
    it('should apply disabled class', () => {
      const wrapper = mount(ButtonUI, { props: { disabled: true } })
      expect(wrapper.find('button').classes()).toContain('btn-disabled')
    })

    it('should apply active class', () => {
      const wrapper = mount(ButtonUI, { props: { active: true } })
      expect(wrapper.find('button').classes()).toContain('btn-active')
    })

    it('should apply outline class', () => {
      const wrapper = mount(ButtonUI, { props: { outline: true } })
      expect(wrapper.find('button').classes()).toContain('btn-outline')
    })

    it('should apply no-animation class', () => {
      const wrapper = mount(ButtonUI, { props: { noAnimation: true } })
      expect(wrapper.find('button').classes()).toContain('btn-no-animation')
    })

    it('should apply block class', () => {
      const wrapper = mount(ButtonUI, { props: { block: true } })
      expect(wrapper.find('button').classes()).toContain('btn-block')
    })

    it('should apply wide class', () => {
      const wrapper = mount(ButtonUI, { props: { wide: true } })
      expect(wrapper.find('button').classes()).toContain('btn-wide')
    })
  })
})
