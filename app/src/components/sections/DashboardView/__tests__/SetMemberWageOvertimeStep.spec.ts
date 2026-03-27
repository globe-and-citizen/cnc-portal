import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { NETWORK } from '@/constant'
import SetMemberWageOvertimeStep from '../SetMemberWageOvertimeStep.vue'
import type { WageWithForm } from '../SetMemberWageModal.vue'

const createWageData = (overrides: Partial<WageWithForm> = {}): WageWithForm => ({
  id: 1,
  teamId: 1,
  userAddress: '0x123',
  maximumHoursPerWeek: 40,
  maximumOvertimeHoursPerWeek: 8,
  enableOvertimeRules: true,
  ratePerHour: [
    { type: 'native', amount: 10, enabled: true },
    { type: 'usdc', amount: 5, enabled: true },
    { type: 'sher', amount: 0, enabled: false }
  ],
  overtimeRatePerHour: [
    { type: 'native', amount: 15, enabled: true },
    { type: 'usdc', amount: 0, enabled: false },
    { type: 'sher', amount: 0, enabled: false }
  ],
  nextWageId: null,
  createdAt: '',
  updatedAt: '',
  ...overrides
})

const UAlertStub = defineComponent({
  name: 'UAlert',
  template: '<div><slot name="description" /></div>'
})

const UFormStub = defineComponent({
  name: 'UForm',
  template: '<form><slot /></form>'
})

const UFormFieldStub = defineComponent({
  name: 'UFormField',
  props: {
    name: {
      type: String,
      default: ''
    }
  },
  template: '<div :data-test="`field-${name}`"><slot /></div>'
})

const UInputStub = defineComponent({
  name: 'UInput',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  template: `
		<div>
			<slot name="leading" />
			<input
				v-bind="$attrs"
				:disabled="disabled"
				:value="modelValue"
				@input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
			/>
			<slot name="trailing" />
		</div>
	`
})

const UFieldGroupStub = defineComponent({
  name: 'UFieldGroup',
  template: '<div><slot /></div>'
})

const USwitchStub = defineComponent({
  name: 'USwitch',
  inheritAttrs: false,
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', ($event.target as HTMLInputElement).checked)" />'
})

const UBadgeStub = defineComponent({
  name: 'UBadge',
  template: '<span data-test="rate-badge"><slot /></span>'
})

const createWrapper = (wageData = createWageData()) =>
  mount(SetMemberWageOvertimeStep, {
    props: {
      wageData,
      isPending: false,
      'onUpdate:wageData': (newValue: WageWithForm) => newValue
    }
  })

describe('SetMemberWageOvertimeStep.vue', () => {
  it('renders overtime banner and recap sections', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="overtime-rules-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overtime-banner"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Hours beyond')
    expect(wrapper.text()).toContain('40 hrs/wk')
    expect(wrapper.find('[data-test="standard-rate-recap"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="overtime-rate-recap"]').exists()).toBe(true)
  })

  it('renders formatted standard and overtime rate recap values', () => {
    const wrapper = createWrapper(
      createWageData({
        ratePerHour: [
          { type: 'native', amount: 10, enabled: true },
          { type: 'usdc', amount: 5, enabled: true },
          { type: 'sher', amount: 0, enabled: false }
        ],
        overtimeRatePerHour: [
          { type: 'native', amount: 20, enabled: true },
          { type: 'usdc', amount: 0, enabled: false },
          { type: 'sher', amount: 0, enabled: false }
        ]
      })
    )

    expect(wrapper.text()).toContain(`${NETWORK.currencySymbol} 10`)
    expect(wrapper.text()).toContain('USDC 5')
    expect(wrapper.text()).toContain(`${NETWORK.currencySymbol} 20`)
  })
})
