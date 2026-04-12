import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestingPinia } from '@pinia/testing'
import { useDeleteMemberMutation } from '@/queries/member.queries'
import DeleteMemberModal from '../DeleteMemberModal.vue'

const mutateSpy = vi.fn()

const makeWrapper = () =>
  mount(DeleteMemberModal, {
    props: {
      member: { name: 'Alice', address: '0xAAA' },
      teamId: '11'
    },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        UserComponent: {
          props: ['user'],
          template: '<div data-test="member-user">{{ user.name }}</div>'
        }
      }
    }
  })

describe('DeleteMemberModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDeleteMemberMutation).mockReturnValue({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref(null)
    } as never)
  })

  it('should open and close modal with trigger and cancel', async () => {
    const wrapper = makeWrapper()

    expect(wrapper.find('[data-test="delete-member-confirm-button"]').exists()).toBe(false)

    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    expect(wrapper.find('[data-test="delete-member-confirm-button"]').exists()).toBe(true)

    await wrapper.find('[data-test="delete-member-cancel-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="delete-member-confirm-button"]').exists()).toBe(false)
  })

  it('should use empty member address fallback when address is missing', async () => {
    const wrapper = mount(DeleteMemberModal, {
      props: {
        member: { name: 'Unknown' },
        teamId: '11'
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: { UserComponent: true }
      }
    })

    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    await wrapper.find('[data-test="delete-member-confirm-button"]').trigger('click')

    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParams: expect.objectContaining({ memberAddress: '' })
      }),
      expect.any(Object)
    )
  })

  it('should handles successful delete by closing modal and emitting event', async () => {
    mutateSpy.mockImplementationOnce((_payload, options) => options?.onSuccess?.())

    const wrapper = makeWrapper()
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    await wrapper.find('[data-test="delete-member-confirm-button"]').trigger('click')

    expect(wrapper.emitted('memberDeleted')).toHaveLength(1)
    expect(wrapper.find('[data-test="delete-member-confirm-button"]').exists()).toBe(false)
  })

  it('renders API error message and fallback error message', async () => {
    vi.mocked(useDeleteMemberMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref({ response: { data: { message: 'Custom backend error' } } })
    } as never)

    const wrapper = makeWrapper()
    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    expect(wrapper.text()).toContain('Custom backend error')

    vi.mocked(useDeleteMemberMutation).mockReturnValueOnce({
      mutate: mutateSpy,
      isPending: ref(false),
      error: ref({})
    } as never)

    const wrapperFallback = makeWrapper()
    await wrapperFallback.find('[data-test="delete-member-button"]').trigger('click')
    expect(wrapperFallback.text()).toContain('Failed to remove member')
  })

  it('should close modal when modal emits update:open false', async () => {
    const wrapper = makeWrapper()

    await wrapper.find('[data-test="delete-member-button"]').trigger('click')
    expect(wrapper.find('[data-test="delete-member-confirm-button"]').exists()).toBe(true)

    await wrapper.find('[data-test="close-wage-modal-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="delete-member-confirm-button"]').exists()).toBe(false)
  })
})
