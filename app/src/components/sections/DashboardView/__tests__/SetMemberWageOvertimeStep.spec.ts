import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { NETWORK } from '@/constant'
import SetMemberWageOvertimeStep from '../SetMemberWageOvertimeStep.vue'
import type { WageWithForm } from '../SetMemberWageModal.vue'

type OvertimeStepVm = {
  validateForm: () => boolean
}

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
      'onUpdate:wageData': (newValue: WageWithForm) => newValue
    },
    global: {
      stubs: {
        UAlert: UAlertStub,
        UForm: UFormStub,
        UFormField: UFormFieldStub,
        UInput: UInputStub,
        UFieldGroup: UFieldGroupStub,
        USwitch: USwitchStub,
        UBadge: UBadgeStub
      }
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

    expect(wrapper.text()).toContain(`10 ${NETWORK.currencySymbol}/hr`)
    expect(wrapper.text()).toContain('5 USDC/hr')
    expect(wrapper.text()).toContain(`20 ${NETWORK.currencySymbol}/hr`)
  })

  it('returns true when overtime form data is valid', () => {
    const wrapper = createWrapper(
      createWageData({
        maximumOvertimeHoursPerWeek: 6,
        overtimeRatePerHour: [
          { type: 'native', amount: 12, enabled: true },
          { type: 'usdc', amount: 0, enabled: false },
          { type: 'sher', amount: 0, enabled: false }
        ]
      })
    )

    const vm = wrapper.vm as unknown as OvertimeStepVm
    expect(vm.validateForm()).toBe(true)
  })

  it('returns false when no overtime rate is enabled', () => {
    const wrapper = createWrapper(
      createWageData({
        overtimeRatePerHour: [
          { type: 'native', amount: 0, enabled: false },
          { type: 'usdc', amount: 0, enabled: false },
          { type: 'sher', amount: 0, enabled: false }
        ]
      })
    )

    const vm = wrapper.vm as unknown as OvertimeStepVm
    expect(vm.validateForm()).toBe(false)
  })

  it('returns false when native overtime rate is disabled or invalid', () => {
    const wrapper = createWrapper(
      createWageData({
        overtimeRatePerHour: [
          { type: 'native', amount: 0, enabled: false },
          { type: 'usdc', amount: 7, enabled: true },
          { type: 'sher', amount: 0, enabled: false }
        ]
      })
    )

    const vm = wrapper.vm as unknown as OvertimeStepVm
    expect(vm.validateForm()).toBe(false)
  })

  it('returns false when native overtime rate entry is missing', () => {
    const wrapper = createWrapper(
      createWageData({
        overtimeRatePerHour: [
          { type: 'usdc', amount: 8, enabled: true },
          { type: 'sher', amount: 3, enabled: true }
        ]
      })
    )

    const vm = wrapper.vm as unknown as OvertimeStepVm
    expect(vm.validateForm()).toBe(false)
  })

  it('returns false when overtime hours is not positive', () => {
    const wrapper = createWrapper(
      createWageData({
        maximumOvertimeHoursPerWeek: 0,
        overtimeRatePerHour: [
          { type: 'native', amount: 12, enabled: true },
          { type: 'usdc', amount: 0, enabled: false },
          { type: 'sher', amount: 0, enabled: false }
        ]
      })
    )

    const vm = wrapper.vm as unknown as OvertimeStepVm
    expect(vm.validateForm()).toBe(false)
  })
})
