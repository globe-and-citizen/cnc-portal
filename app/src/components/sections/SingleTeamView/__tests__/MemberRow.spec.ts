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

// Partially mock @vueuse/core
vi.mock('@vueuse/core', async () => {
  const originalModule = await vi.importActual<typeof vueuse>('@vueuse/core')
  return {
    ...originalModule,
    useClipboard: () => {
      const clipboard = {
        copy: vi.fn(() => {
          console.log("Copied")
          clipboard.copied = true
        }),
        copied: false,
        isSupported: true
      }
      return clipboard
    }
  }
})
// vi.mock('@vueuse/core', () => ({
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

    it("render the copy button in the copyed stat", () => {
      vi.mock('@vueuse/core', async () => {
        const originalModule = await vi.importActual<typeof vueuse>('@vueuse/core')
        return {
          ...originalModule,
          useClipboard: () => {
            const clipboard = {
              copy: vi.fn(),
              copied: true,
              isSupported: true
            }
            return clipboard
          }
        }
      })
      expect(wrapper.find('[data-test="copy-address-tooltip"]').exists()).toBe(false)
    })

    it("not render the copy button if copy is not supported", () => {
      vi.mock('@vueuse/core', async () => {
        const originalModule = await vi.importActual<typeof vueuse>('@vueuse/core')
        return {
          ...originalModule,
          useClipboard: () => {
            const clipboard = {
              copy: vi.fn(),
              copied: false,
              isSupported: false
            }
            return clipboard
          }
        }
      })
      expect(wrapper.find('[data-test="copy-address-tooltip"]').exists()).toBe(false)
    })
  })

  describe('methods', () => {

    // test on click on data-test="member-address-tooltip" that open in a new tab
    it('should open the address in a new tab', async () => {
      const open = vi.fn()
      global.open = open
      await wrapper.find('[data-test="member-address-tooltip"]').trigger('click')
      expect(open).toHaveBeenCalledWith(
        `https://sepolia.etherscan.io/address/${props.member.address}`,
        '_blank'
      )
    })
  })
})
