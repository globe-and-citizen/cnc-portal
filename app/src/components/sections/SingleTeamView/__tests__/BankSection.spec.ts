import { mount, enableAutoUnmount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import BankSection from '@/components/sections/SingleTeamView/BankSection.vue'
import { setActivePinia, createPinia } from 'pinia'
// import type { T } from 'vitest/dist/reporters-B7ebVMkT.js'

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'
  }))
}))

const team = {
  bankAddress: '0xd6307a4B12661a5254CEbB67eFA869E37d0421E6',
  ownerAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
  boardOfDirectorsAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
  members: []
}
describe('BankSection', () => {
  let wrapper: ReturnType<typeof mount>
  setActivePinia(createPinia())

  enableAutoUnmount(afterEach)
  beforeEach(() => {
    // interface mockReturn {
    //   mockReturnValue: (address: Object) => {}
    // }

    wrapper = mount(BankSection, {
      props: {
        team
      }
    })
  })

  describe('Render', () => {
    it('should show team bank address', () => {
      expect(wrapper.find('[data-test="team-bank-address"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="team-bank-address"]').text()).toContain(team.bankAddress)
    })

    // TODO Show loading stat on Deposit, Tips, or transfer
  })

  describe('Methods', () => {
    it('should bind the tip amount input correctly', async () => {
      // const wrapper = createComponent()
      const input = wrapper.find('input')
      await input.setValue('10')
      expect(input.element.value).toBe('10')
    })
  })
})
