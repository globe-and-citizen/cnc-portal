import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUpdateTeamMutation } from '@/queries/team.queries'
import { useTeamStore } from '@/stores'
import { mockTeamData } from '@/tests/mocks'
import TeamMetaUpdateModal from '../TeamMetaUpdateModal.vue'

const mutateSpy = vi.fn()
const resetSpy = vi.fn()

const formStubs = {
  UFormField: {
    name: 'UFormField',
    props: ['label', 'name', 'required', 'help', 'hint'],
    template: '<div><span v-if="hint">{{ hint }}</span><slot /></div>'
  },
  UInput: {
    name: 'UInput',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', ($event.target as HTMLInputElement).value)" />'
  },
  UTextarea: {
    name: 'UTextarea',
    props: ['modelValue', 'placeholder', 'rows'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', ($event.target as HTMLTextAreaElement).value)" />'
  },
  UAlert: {
    name: 'UAlert',
    props: ['color', 'description', 'variant'],
    template: '<div data-test="update-alert">{{ description }}</div>'
  }
}

const mountModal = () =>
  mount(TeamMetaUpdateModal, {
    global: {
      stubs: formStubs
    }
  })

async function openModal(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.findComponent({ name: 'UModal' }).vm.$emit('update:open', true)
  await wrapper.vm.$nextTick()
}

async function submitForm(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.get('form.flex.flex-col.gap-5').trigger('submit')
  await flushPromises()
}

describe('TeamMetaUpdateModal.vue', () => {
  beforeEach(() => {
    mutateSpy.mockClear()
    resetSpy.mockClear()
    vi.mocked(useTeamStore).mockReturnValue({
      currentTeamId: '1',
      currentTeamMeta: {
        data: {
          ...mockTeamData,
          name: 'Stored Name',
          description: 'Stored description text'
        }
      }
    } as never)
    vi.mocked(useUpdateTeamMutation).mockReturnValue({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(null),
      reset: resetSpy
    } as never)
  })

  it('prefills from store when clicking update', async () => {
    const wrapper = mountModal()
    await wrapper.find('[data-test="team-meta-update-open"]').trigger('click')
    await openModal(wrapper)

    const input = wrapper.find('input')
    const textarea = wrapper.find('textarea')
    expect((input.element as HTMLInputElement).value).toBe('Stored Name')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('Stored description text')
  })

  it('prefills with empty strings when meta is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValueOnce({
      currentTeamId: '1',
      currentTeamMeta: { data: undefined }
    } as never)

    const wrapper = mountModal()
    await wrapper.find('[data-test="team-meta-update-open"]').trigger('click')
    await openModal(wrapper)

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('submits update with form state and runs success handlers', async () => {
    mutateSpy.mockImplementationOnce((_payload, options) => {
      options?.onSuccess?.()
    })

    const wrapper = mountModal()
    await wrapper.find('[data-test="team-meta-update-open"]').trigger('click')
    await openModal(wrapper)

    await wrapper.find('input').setValue('New company name')
    await wrapper.find('textarea').setValue('A long enough description for validation rules.')

    await submitForm(wrapper)

    expect(mutateSpy).toHaveBeenCalledWith(
      {
        pathParams: { id: '1' },
        body: {
          name: 'New company name',
          description: 'A long enough description for validation rules.'
        }
      },
      expect.any(Object)
    )
    expect(resetSpy).toHaveBeenCalled()
  })

  it('does not mutate when company id is missing', async () => {
    vi.mocked(useTeamStore).mockReturnValueOnce({
      currentTeamId: null,
      currentTeamMeta: { data: { ...mockTeamData, name: 'Xxx', description: 'Y'.repeat(12) } }
    } as never)

    const wrapper = mountModal()
    await wrapper.find('[data-test="team-meta-update-open"]').trigger('click')
    await openModal(wrapper)
    await submitForm(wrapper)

    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('shows mutation error text', async () => {
    vi.mocked(useUpdateTeamMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(new Error('Update rejected')),
      reset: resetSpy
    } as never)

    const wrapper = mountModal()
    await openModal(wrapper)
    expect(wrapper.text()).toContain('Update rejected')
  })

  it('shows description length hint in the form', async () => {
    const wrapper = mountModal()
    await wrapper.find('[data-test="team-meta-update-open"]').trigger('click')
    await openModal(wrapper)
    await wrapper.find('textarea').setValue('1234567890')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('10 / 200')
  })

  it('disables save while pending', async () => {
    vi.mocked(useUpdateTeamMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(true),
      error: ref(null),
      reset: resetSpy
    } as never)

    const wrapper = mountModal()
    await openModal(wrapper)
    const save = wrapper.findAll('button').find((b) => b.text().includes('Save changes'))
    expect(save?.attributes('disabled')).toBeDefined()
  })
})
