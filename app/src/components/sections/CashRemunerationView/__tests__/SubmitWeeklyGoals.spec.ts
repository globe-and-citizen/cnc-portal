import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SubmitWeeklyGoals from '../SubmitWeeklyGoals.vue'
import type { WeeklyClaim } from '@/types'
import { mockTeamStore, mockToast } from '@/tests/mocks'

// The mutation hook is replaced with a controllable spy; every other export of
// the queries module is preserved so unrelated imports keep working.
const { submitGoalsMock } = vi.hoisted(() => ({ submitGoalsMock: vi.fn() }))

vi.mock('@/queries/weeklyClaim.queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/queries/weeklyClaim.queries')>()
  return {
    ...actual,
    useSubmitWeeklyGoalsMutation: () => ({ mutateAsync: submitGoalsMock, isPending: false })
  }
})

const TeamArchivedTooltipStub = {
  name: 'TeamArchivedTooltip',
  template: '<div><slot :disabled="false" /></div>'
}

// Stub the editor to a bare textarea so the modal's memo value is drivable.
const MarkdownEditorStub = {
  name: 'MarkdownEditor',
  props: ['modelValue', 'placeholder'],
  emits: ['update:modelValue'],
  template:
    '<textarea data-test="md-editor-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
}

const WEEK_START = '2024-06-30T00:00:00.000Z'

const makeWeeklyClaim = (overrides: Partial<WeeklyClaim> = {}): WeeklyClaim =>
  ({
    id: 1,
    status: 'pending',
    weekStart: WEEK_START,
    weeklyGoals: null,
    ...overrides
  }) as WeeklyClaim

const createComponent = (props: Record<string, unknown> = {}) =>
  mount(SubmitWeeklyGoals, {
    props: { selectedWeekStart: WEEK_START, ...props },
    global: {
      stubs: {
        TeamArchivedTooltip: TeamArchivedTooltipStub,
        MarkdownEditor: MarkdownEditorStub
      }
    }
  })

describe('SubmitWeeklyGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitGoalsMock.mockResolvedValue({})
    mockTeamStore.currentTeamId = '1'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('labels the button "Submit Weekly Goals" when no memo exists yet', () => {
    const wrapper = createComponent({ weeklyClaim: makeWeeklyClaim() })
    expect(wrapper.get('[data-test="submit-weekly-goals-button"]').text()).toBe(
      'Submit Weekly Goals'
    )
  })

  it('labels the button "Edit Weekly Goals" when a memo already exists', () => {
    const wrapper = createComponent({
      weeklyClaim: makeWeeklyClaim({ weeklyGoals: '# Existing' })
    })
    expect(wrapper.get('[data-test="submit-weekly-goals-button"]').text()).toBe('Edit Weekly Goals')
  })

  it('disables the button once the week is signed', () => {
    const wrapper = createComponent({ weeklyClaim: makeWeeklyClaim({ status: 'signed' }) })
    expect(
      wrapper.get('[data-test="submit-weekly-goals-button"]').attributes('disabled')
    ).toBeDefined()
  })

  it('submits the memo with the team id and selected week, then toasts success', async () => {
    const wrapper = createComponent({
      weeklyClaim: makeWeeklyClaim({ weeklyGoals: '# Existing goals' })
    })

    await wrapper.get('[data-test="submit-weekly-goals-button"]').trigger('click')
    await wrapper.get('[data-test="submit-weekly-goals-confirm"]').trigger('click')
    await flushPromises()

    expect(submitGoalsMock).toHaveBeenCalledWith({
      body: { teamId: '1', weekStart: WEEK_START, weeklyGoals: '# Existing goals' }
    })
    expect(mockToast.add).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('sends the edited memo content from the editor', async () => {
    const wrapper = createComponent({ weeklyClaim: makeWeeklyClaim() })

    await wrapper.get('[data-test="submit-weekly-goals-button"]').trigger('click')
    await wrapper.get('[data-test="md-editor-stub"]').setValue('## Rewritten plan')
    await wrapper.get('[data-test="submit-weekly-goals-confirm"]').trigger('click')
    await flushPromises()

    expect(submitGoalsMock).toHaveBeenCalledWith({
      body: { teamId: '1', weekStart: WEEK_START, weeklyGoals: '## Rewritten plan' }
    })
  })
})
