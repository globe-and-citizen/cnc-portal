import MemberRow from '@/components/sections/SingleTeamView/MemberRow.vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn()
}))

vi.mock('@/stores/useToastStore', () => ({
  useToastStore: vi.fn()
}))
vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))

describe('MemberRow.vue', () => {
  let wrapper: ReturnType<typeof mount>
  const props = {
    ownerAddress: 'owner123',
    teamId: 1,
    member: {
      name: 'Alice',
      address: '1234',
      index: 1
    }
  }

  const addSuccessToast = vi.fn()
  const addErrorToast = vi.fn()

  let mockToastStore: ReturnType<typeof useToastStore>
  beforeEach(() => {
    interface mockReturn {
      mockReturnValue: (address: Object) => {}
    }
    mockToastStore = {
      addSuccessToast: vi.fn(),
      addErrorToast: vi.fn()
    }
    ;(useUserDataStore as unknown as mockReturn).mockReturnValue({
      address: 'owner123'
    })
    ;(useToastStore as unknown as mockReturn).mockReturnValue({
      addSuccessToast,
      addErrorToast
    })

    wrapper = mount(MemberRow, {
      props: { ...props }
    })
  })

  describe('renders', () => {
    it('renders the member data', () => {
      expect(wrapper.text()).toContain(props.member.name)
      expect(wrapper.text()).toContain(props.member.address)
    })
  })

  describe('methods', () => {
    interface ComponentData {
      showDeleteMemberConfirmModal: boolean
    }
    it('should show the modal when delete button is clicked', async () => {
      await wrapper.find('[data-test="delete-member-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).showDeleteMemberConfirmModal).toBe(true)
    })

    it('should success toast when delete is successful', async () => {
      await wrapper.find('[data-test="delete-member-button"]').trigger('click')
      await wrapper.vm.$nextTick()
      expect((wrapper.vm as unknown as ComponentData).showDeleteMemberConfirmModal).toBe(true)

      await wrapper.find('[data-test="delete-member-confirm-button"]').trigger('click')
      await wrapper.vm.$nextTick()

      // TODO : find a way to check that the toast is called

      // wrapper.vm.$watch('deleteMemberError', () => {
      //   console.log('wrapper.vm.deleteMemberError', wrapper.vm.deleteMemberError)
      //   if (!wrapper.vm.deleteMemberError) {
      //     mockToastStore.addSuccessToast('Member deleted successfully')
      //   } else {
      //     mockToastStore.addErrorToast('Failed to delete member')
      //   }
      // })
      // expect(mockToastStore.addSuccessToast).toHaveBeenCalled()
    })
    // TODO: test when delete is validated
  })
})
