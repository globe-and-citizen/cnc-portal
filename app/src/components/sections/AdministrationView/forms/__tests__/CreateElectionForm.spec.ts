import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { CalendarDate } from '@internationalized/date'
import CreateElectionForm from '../CreateElectionForm.vue'
import { emittedPayload, getVm, mountComponent, tomorrow } from './CreateElectionForm.harness'

describe('CreateElectionForm.vue', () => {
  it('renders form defaults and submit button disabled state', () => {
    const wrapper = mountComponent(true)
    const vm = getVm(wrapper)

    expect(vm.newProposalInput.isElection).toBe(true)
    expect(vm.state.startDay).toBeNull()
    expect(vm.state.endDay).toBeNull()
    expect(wrapper.find('[data-test="winnerCountInput"]').exists()).toBe(true)
    expect((wrapper.find('[data-test="submitButton"]').element as HTMLButtonElement).disabled).toBe(
      true
    )
    // The odd-number rule is stated up front, not left to the submit error.
    expect(wrapper.text()).toContain('An odd number')
  })

  it('renders error alert when errorMessage prop is set', async () => {
    const wrapper = mount(CreateElectionForm, {
      props: { isLoading: false, errorMessage: 'Contract reverted' }
    })

    const alert = wrapper.find('[data-test="error-alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('Contract reverted')

    await wrapper.setProps({ errorMessage: '' })
    expect(wrapper.find('[data-test="error-alert"]').exists()).toBe(false)
  })

  it('syncs input and popover v-model bindings with component state', async () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    await wrapper.find('[data-test="titleInput"]').setValue('Election title')
    await wrapper.find('[data-test="descriptionInput"]').setValue('Election description details')
    await wrapper.find('[data-test="winnerCountInput"]').setValue('5')
    await wrapper.find('[data-test="endTimeInput"]').setValue('18:00')

    const popovers = wrapper.findAllComponents({ name: 'UPopover' })
    await popovers[0]!.vm.$emit('update:open', true)
    await popovers[1]!.vm.$emit('update:open', true)

    expect(vm.state.title).toBe('Election title')
    expect(vm.state.description).toBe('Election description details')
    expect(vm.state.winnerCount).toBe(5)
    expect(vm.state.endTime).toBe('18:00')
    expect(vm.startDateOpen).toBe(true)
    expect(vm.endDateOpen).toBe(true)
  })

  it('requires at least one candidate', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.endDay = tomorrow()
    vm.formData = []

    vm.submitForm()

    expect(vm.errors.candidates).toBe('At least one candidate is required.')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('requires enough candidates based on winnerCount', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.endDay = tomorrow()
    vm.state.winnerCount = '3'
    vm.formData = [
      { address: '0x1', name: 'Alice' },
      { address: '0x2', name: 'Bob' }
    ]

    vm.submitForm()

    expect(vm.errors.candidates).toBe('At least 3 candidates are required.')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('rejects duplicate candidates', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.endDay = tomorrow()
    vm.state.winnerCount = '1'
    vm.formData = [
      { address: '0x1', name: 'Alice' },
      { address: '0x1', name: 'Alice Clone' }
    ]

    vm.submitForm()

    expect(vm.errors.candidates).toBe('Duplicate candidates are not allowed.')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('normalizes missing candidate fields to empty strings', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.title = 'Election 2026'
    vm.state.description = 'Board election for fallback field normalization.'
    vm.state.winnerCount = '0'
    vm.state.endDay = tomorrow()
    vm.formData = [{ address: '', name: '' }]

    vm.submitForm()

    expect(wrapper.emitted('createProposal')).toBeTruthy()
    expect(emittedPayload(wrapper).candidates).toEqual([{ name: '', candidateAddress: '' }])
  })

  it('updates both days from the calendar handlers declared in popover content', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)
    const popovers = wrapper.findAllComponents({ name: 'UPopover' })

    expect(popovers).toHaveLength(2)

    const calendarUpdate = (index: number) => {
      const slot = popovers[index]!.vm.$slots.content as () => Array<{ props?: object }>
      const props = slot()?.[0]?.props as Record<string, unknown>
      return props['onUpdate:modelValue'] as (value: CalendarDate) => void
    }

    vm.startDateOpen = true
    calendarUpdate(0)(new CalendarDate(2030, 1, 1))
    expect(vm.startDateOpen).toBe(false)
    expect(vm.state.startDay?.getFullYear()).toBe(2030)
    expect(vm.state.startTime).toBe('00:00')

    vm.endDateOpen = true
    calendarUpdate(1)(new CalendarDate(2030, 2, 2))
    expect(vm.endDateOpen).toBe(false)
    expect(vm.state.endDay).toBeInstanceOf(Date)
    expect(vm.state.endDay?.getFullYear()).toBe(2030)
  })

  it('updates formData through MultiSelectMemberInput v-model binding', async () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)
    const multiSelect = wrapper.findComponent({ name: 'MultiSelectMemberInput' })

    expect(multiSelect.exists()).toBe(true)

    await multiSelect.vm.$emit('update:modelValue', [{ address: '0xabc', name: 'Alice' }])

    expect(vm.formData).toEqual([{ address: '0xabc', name: 'Alice' }])
  })

  it('applies winnerCount zod constraints for minimum and odd values', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    const tooSmall = vm.schema.safeParse({
      title: 'Election',
      description: 'A valid election description',
      winnerCount: '2'
    })
    const notOdd = vm.schema.safeParse({
      title: 'Election',
      description: 'A valid election description',
      winnerCount: '4'
    })

    expect(tooSmall.success).toBe(false)
    expect(notOdd.success).toBe(false)
  })

  it('registers and removes outside click listener on mount lifecycle', () => {
    const addListenerSpy = vi.spyOn(document, 'addEventListener')
    const removeListenerSpy = vi.spyOn(document, 'removeEventListener')

    const wrapper = mountComponent()
    wrapper.unmount()

    expect(addListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(removeListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))

    addListenerSpy.mockRestore()
    removeListenerSpy.mockRestore()
  })

  it('handles outside click only when ref exists and target is outside', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.showDropdown = true
    vm.handleClickOutside({ target: document.body } as unknown as MouseEvent)
    expect(vm.showDropdown).toBe(true)

    vm.formRef = {
      contains: () => true
    }
    vm.handleClickOutside({ target: document.body } as unknown as MouseEvent)
    expect(vm.showDropdown).toBe(true)

    vm.formRef = {
      contains: () => false
    }
    vm.handleClickOutside({ target: document.body } as unknown as MouseEvent)
    expect(vm.showDropdown).toBe(false)
  })
})
