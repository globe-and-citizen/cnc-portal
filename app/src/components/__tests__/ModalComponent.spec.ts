import { describe, it, expect, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import ModalComponent from '@/components/ModalComponent.vue'
import ButtonUI from '@/components/ButtonUI.vue'

describe('ModalComponent', () => {
  let wrapper: VueWrapper

  const SELECTORS = {
    modal: 'dialog',
    modalBox: '.modal-box',
    backdrop: '.modal-backdrop'
  } as const

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Modal Interaction', () => {
    it('should emit update:modelValue and reset when close button clicked', async () => {
      wrapper = mount(ModalComponent, { props: { modelValue: true } })

      await wrapper.findComponent(ButtonUI).trigger('click')

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
      expect(wrapper.emitted('reset')).toBeTruthy()
    })

    it('should close modal when backdrop is clicked without reset event', async () => {
      wrapper = mount(ModalComponent, { props: { modelValue: true } })

      await wrapper.find(SELECTORS.backdrop).trigger('click')

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
      expect(wrapper.emitted('reset')).toBeFalsy()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', async () => {
      wrapper = mount(ModalComponent, {
        props: { modelValue: true },
        attachTo: document.body
      })

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()

      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
      expect(wrapper.emitted('reset')).toBeFalsy()
    })
  })
})
