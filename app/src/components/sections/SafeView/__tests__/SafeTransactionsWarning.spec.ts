import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SafeTransactionsWarning from '../SafeTransactionsWarning.vue'

const stubs = {
  UModal: {
    props: ['open'],
    template: '<section><slot name="body" /></section>'
  },
  UButton: {
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
  },
  IconifyIcon: true
}

describe('SafeTransactionsWarning', () => {
  it('explains and labels a conflicting approval', () => {
    const wrapper = mount(SafeTransactionsWarning, {
      props: { modelValue: true, action: 'approve' },
      global: { stubs }
    })

    expect(wrapper.get('[data-test="confirm-execute-button"]').text()).toBe('Approve Anyway')
    expect(wrapper.text()).toContain('Your approval will be recorded.')
  })

  it('emits confirmation or cancellation from the warning controls', async () => {
    const wrapper = mount(SafeTransactionsWarning, {
      props: { modelValue: true, action: 'execute' },
      global: { stubs }
    })

    await wrapper.get('[data-test="confirm-execute-button"]').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)

    await wrapper.get('[data-test="cancel-execute-button"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
