import { ref } from 'vue'
import MemberRow from '@/components/sections/SingleTeamView/MemberRow.vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useUserDataStore } from '@/stores/user'
import { useToastStore } from '@/stores/useToastStore'
import * as vueuse from '@vueuse/core'

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

const mockCopy = vi.fn()
const mockClipboard = {
  copy: mockCopy,
  copied: ref(false),
  isSupported: ref(true)
}

vi.mock('@vueuse/core', async () => {
  const originalModule = await vi.importActual<typeof vueuse>('@vueuse/core')
  return {
    ...originalModule,
    useClipboard: vi.fn(() => mockClipboard)
  }
})

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
  beforeEach(() => {
    interface mockReturn {
      mockReturnValue: (address: Object) => {}
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

    it('render the copy button in the copyed stat', async () => {
      mockClipboard.isSupported.value = true
      mockClipboard.copied.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="copy-address-tooltip"]').exists()).toBe(true)
    })

    it('not render the copy button if copy is not supported', async () => {
      mockClipboard.isSupported.value = false
      mockClipboard.copied.value = false
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-test="copy-address-tooltip"]').exists()).toBe(false)
    })
  })

  describe('methods', () => {

    // TODO: Find a way to watch on the copy function
    // it.only("should copy the member's address to the clipboard", async () => {
    //   mockClipboard.isSupported.value = true
    //   mockClipboard.copied.value = false 
    //   await wrapper.vm.$nextTick()

    //   await wrapper.find('[data-test="copy-address-tooltip"]').trigger('click')
    //   await wrapper.vm.$nextTick()
    //   expect(mockCopy).toHaveBeenCalledWith(props.member.address)
    //   expect(mockClipboard.copied.value).toBe(true)
    // })
    it('should open the address in a new tab', async () => {
      const open = vi.fn()
      global.open = open
      await wrapper.find('[data-test="address-tooltip"]').trigger('click')
      expect(open).toHaveBeenCalledWith(
        `https://sepolia.etherscan.io/address/${props.member.address}`,
        '_blank'
      )
    })
  })
})