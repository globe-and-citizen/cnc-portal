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

// Partially mock @vueuse/core
// vi.mock('@vueuse/core', async () => {
//   const originalModule = await vi.importActual<typeof vueuse>('@vueuse/core')
//   return {
//     ...originalModule,
//     createFetch: vi.fn() // Mock createFetch
//   }
// })
// vi.mock('@vueuse/core', () => ({
//   useClipboard: () => ({
//   copy: vi.fn(),
//   copied: false,
//   isSupported: true
//   })
// }))


describe.only('MemberRow.vue', () => {
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
  })

  // describe('methods', () => {
    // test on click on data-test="copy-address-tooltip"
    // it('should copy the address to the clipboard', async () => {
    //   const copyButton = wrapper.find('[data-test="copy-address-tooltip"]')
    //   console.log(wrapper.html())
    //   expect(copyButton.exists()).toBe(true)
    //   await copyButton.trigger('click')
    //   // expected to call the mocked useClipboard() composable copy() function called with the address
    //   // expect(useClipboard().copy).toHaveBeenCalledWith(props.member.address)
    // })

    // test on click on data-test="member-address-tooltip" that open in a new tab
    // it('should open the address in a new tab', async () => {
    //   const open = vi.fn()
    //   global.open = open
    //   await wrapper.find('[data-test="member-address-tooltip"]').trigger('click')
    //   expect(open).toHaveBeenCalledWith(
    //     `https://sepolia.etherscan.io/address/${props.member.address}`,
    //     '_blank'
    //   )
    // })
  // })
})
