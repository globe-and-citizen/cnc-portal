import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useTeamStore } from '@/stores'
import { mockTeamData, mockUserStore } from '@/tests/mocks'
import RequireWeeklyGoalsToggle from '../RequireWeeklyGoalsToggle.vue'

const OWNER = '0x2222222222222222222222222222222222222222'
const MEMBER = '0x1111111111111111111111111111111111111111'
const mutateSpy = vi.fn()

const SwitchStub = defineComponent({
  name: 'USwitch',
  props: { modelValue: Boolean, disabled: Boolean, loading: Boolean },
  emits: ['update:modelValue'],
  template: '<button />'
})

const mountToggle = ({ requireWeeklyGoals = false, isArchived = false } = {}) => {
  vi.mocked(useTeamStore).mockReturnValue({
    currentTeamId: '7',
    currentTeamMeta: {
      data: { ...mockTeamData, ownerAddress: OWNER, requireWeeklyGoals, isArchived }
    }
  } as never)
  return mount(RequireWeeklyGoalsToggle, { global: { stubs: { Switch: SwitchStub } } })
}

const findSwitch = (wrapper: ReturnType<typeof mountToggle>) => wrapper.findComponent(SwitchStub)

describe('[AC-US-PAYROLL-005-28] RequireWeeklyGoalsToggle', () => {
  beforeEach(() => {
    mutateSpy.mockClear()
    mockUserStore.address = OWNER
    vi.mocked(useUpdateTeamMutation).mockReturnValue({
      mutate: mutateSpy,
      isPending: ref(false)
    } as never)
  })

  it('is hidden from a member who is not the owner', () => {
    mockUserStore.address = MEMBER

    const wrapper = mountToggle()

    expect(wrapper.find('[data-test="require-weekly-goals-setting"]').exists()).toBe(false)
  })

  it('shows the owner the rule currently saved on the team', () => {
    const wrapper = mountToggle({ requireWeeklyGoals: true })

    expect(wrapper.text()).toContain('Require weekly goals')
    expect(findSwitch(wrapper).props('modelValue')).toBe(true)
  })

  it('saves the new rule on the team when the owner flips it', async () => {
    const wrapper = mountToggle({ requireWeeklyGoals: false })

    await findSwitch(wrapper).vm.$emit('update:modelValue', true)

    expect(mutateSpy).toHaveBeenCalledWith(
      { pathParams: { id: '7' }, body: { requireWeeklyGoals: true } },
      expect.any(Object)
    )
  })

  it('cannot be changed while the team is archived', () => {
    const wrapper = mountToggle({ isArchived: true })

    expect(findSwitch(wrapper).props('disabled')).toBe(true)
  })
})
