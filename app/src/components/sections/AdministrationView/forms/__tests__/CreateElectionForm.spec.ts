import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { CalendarDate } from '@internationalized/date'
import CreateElectionForm from '../CreateElectionForm.vue'

interface CreateElectionFormVm {
  state: {
    title: string
    description: string
    winnerCount: string | number
    startDate: Date | null
    endDate: Date | null
  }
  errors: {
    startDate: string
    endDate: string
    candidates: string
  }
  formData: Array<{ address: string; name: string }>
  newProposalInput: { isElection?: boolean }
  startDateOpen: boolean
  endDateOpen: boolean
  formRef: { contains: (node: Node) => boolean } | null
  showDropdown: boolean
  handleClickOutside: (event: MouseEvent) => void
  submitForm: () => void
  schema: {
    safeParse: (data: unknown) => { success: boolean }
  }
}

const mountComponent = (isLoading = false) =>
  mount(CreateElectionForm, {
    props: { isLoading }
  })

const getVm = (wrapper: ReturnType<typeof mountComponent>) =>
  Reflect.get(wrapper, 'vm') as unknown as CreateElectionFormVm

describe('CreateElectionForm.vue', () => {
  it('renders form defaults and submit button disabled state', () => {
    const wrapper = mountComponent(true)
    const vm = getVm(wrapper)

    expect(vm.newProposalInput.isElection).toBe(true)
    expect(vm.state.startDate).toBeInstanceOf(Date)
    expect(wrapper.find('[data-test="winnerCountInput"]').exists()).toBe(true)
    expect((wrapper.find('[data-test="submitButton"]').element as HTMLButtonElement).disabled).toBe(
      true
    )
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

    const popovers = wrapper.findAllComponents({ name: 'UPopover' })
    await popovers[0]!.vm.$emit('update:open', true)
    await popovers[1]!.vm.$emit('update:open', true)

    expect(vm.state.title).toBe('Election title')
    expect(vm.state.description).toBe('Election description details')
    expect(vm.state.winnerCount).toBe(5)
    expect(vm.startDateOpen).toBe(true)
    expect(vm.endDateOpen).toBe(true)
  })

  it('sets startDate required error when start date is missing', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.startDate = null
    vm.state.endDate = new Date(Date.now() + 10 * 60 * 1000)
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.submitForm()

    expect(vm.errors.startDate).toBe('Start date is required')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('sets endDate required error when end date is missing', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.startDate = new Date(Date.now() + 5 * 60 * 1000)
    vm.state.endDate = null
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.submitForm()

    expect(vm.errors.endDate).toBe('End date is required')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('sets chronological error when start date is after or equal to end date', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)
    const sameDate = new Date(Date.now() + 10 * 60 * 1000)

    vm.state.startDate = sameDate
    vm.state.endDate = sameDate
    vm.formData = [{ address: '0x1', name: 'Alice' }]

    vm.submitForm()

    expect(vm.errors.startDate).toBe('Start date must be before end date')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('requires at least one candidate', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.startDate = new Date(Date.now() + 5 * 60 * 1000)
    vm.state.endDate = new Date(Date.now() + 10 * 60 * 1000)
    vm.formData = []

    vm.submitForm()

    expect(vm.errors.candidates).toBe('At least one candidate is required.')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('requires enough candidates based on winnerCount', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.startDate = new Date(Date.now() + 5 * 60 * 1000)
    vm.state.endDate = new Date(Date.now() + 10 * 60 * 1000)
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

    vm.state.startDate = new Date(Date.now() + 5 * 60 * 1000)
    vm.state.endDate = new Date(Date.now() + 10 * 60 * 1000)
    vm.state.winnerCount = '1'
    vm.formData = [
      { address: '0x1', name: 'Alice' },
      { address: '0x1', name: 'Alice Clone' }
    ]

    vm.submitForm()

    expect(vm.errors.candidates).toBe('Duplicate candidates are not allowed.')
    expect(wrapper.emitted('createProposal')).toBeFalsy()
  })

  it('emits createProposal payload when form is valid', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)
    const startDate = new Date(Date.now() + 5 * 60 * 1000)
    const endDate = new Date(Date.now() + 10 * 60 * 1000)

    vm.state.title = 'Election 2026'
    vm.state.description = 'Board election for the next organizational cycle.'
    vm.state.winnerCount = '3'
    vm.state.startDate = startDate
    vm.state.endDate = endDate
    vm.formData = [
      { address: '0x1', name: 'Alice' },
      { address: '0x2', name: 'Bob' },
      { address: '0x3', name: 'Carol' }
    ]

    vm.submitForm()

    const emitted = wrapper.emitted('createProposal')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]?.[0]).toEqual({
      isElection: true,
      title: 'Election 2026',
      description: 'Board election for the next organizational cycle.',
      startDate,
      endDate,
      winnerCount: 3,
      candidates: [
        { name: 'Alice', candidateAddress: '0x1' },
        { name: 'Bob', candidateAddress: '0x2' },
        { name: 'Carol', candidateAddress: '0x3' }
      ]
    })
  })

  it('normalizes missing candidate fields to empty strings', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)

    vm.state.title = 'Election 2026'
    vm.state.description = 'Board election for fallback field normalization.'
    vm.state.winnerCount = '0'
    vm.state.startDate = new Date(Date.now() + 5 * 60 * 1000)
    vm.state.endDate = new Date(Date.now() + 10 * 60 * 1000)
    vm.formData = [{ address: '', name: '' }]

    vm.submitForm()

    const emitted = wrapper.emitted('createProposal')
    const firstPayload = emitted?.[0]?.[0] as {
      candidates: Array<{ name: string; candidateAddress: string }>
    }
    expect(emitted).toBeTruthy()
    expect(firstPayload.candidates).toEqual([{ name: '', candidateAddress: '' }])
  })

  it('updates start/end dates from calendar update handlers declared in popover content', () => {
    const wrapper = mountComponent()
    const vm = getVm(wrapper)
    const popovers = wrapper.findAllComponents({ name: 'UPopover' })

    expect(popovers).toHaveLength(2)

    const startContentSlot = popovers[0]!.vm.$slots.content as () => Array<{ props?: object }>
    const endContentSlot = popovers[1]!.vm.$slots.content as () => Array<{ props?: object }>
    const startCalendarProps = startContentSlot()?.[0]?.props as Record<string, unknown>
    const endCalendarProps = endContentSlot()?.[0]?.props as Record<string, unknown>

    const startUpdate = startCalendarProps['onUpdate:modelValue'] as (value: CalendarDate) => void
    const endUpdate = endCalendarProps['onUpdate:modelValue'] as (value: CalendarDate) => void

    vm.startDateOpen = true
    startUpdate(new CalendarDate(2000, 1, 1))
    expect(vm.startDateOpen).toBe(false)
    expect(vm.state.startDate).toBeInstanceOf(Date)
    expect(vm.state.startDate?.getFullYear()).not.toBe(2000)

    vm.endDateOpen = true
    endUpdate(new CalendarDate(2030, 2, 2))
    expect(vm.endDateOpen).toBe(false)
    expect(vm.state.endDate).toBeInstanceOf(Date)
    expect(vm.state.endDate?.getFullYear()).toBe(2030)
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
