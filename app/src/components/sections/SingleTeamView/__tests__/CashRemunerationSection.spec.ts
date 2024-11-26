import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import CashRemunerationSection from '../CashRemunerationSection.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'

// vi.mock('@/stores', () => ({
//   useUserDataStore: vi.fn()
// }))

interface ComponentData {
  isSubmittingHours: boolean
}

describe('CashRemunerationSection.vue', () => {
  setActivePinia(createPinia())

  interface Props {
    team?: {}
  }

  interface ComponentOptions {
    props?: Props
    data?: () => Record<string, unknown>
    global?: Record<string, unknown>
  }

  const createComponent = ({
    props = {},
    data = () => ({}),
    global = {}
  }: ComponentOptions = {}) => {
    return mount(CashRemunerationSection, {
      props: {
        team: {
          id: `1`,
          cashRemunerationEip712Address: '0xExpenseAccount',
          ownerAddress: '0xOwner',
          boardOfDirectorsAddress: null,
          ...props?.team
        },
        ...props
      },
      data,
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              user: { address: '0xInitialUser' }
            }
          })
        ],
        ...global
      }
    })
  }

  describe('Render', () => {
    it('should hide submit button when submitting hours', async () => {
      const wrapper = createComponent()

      ;(wrapper.vm as unknown as ComponentData).isSubmittingHours = true
      await wrapper.vm.$nextTick()

      const submitHoursButton = wrapper.find('[data-test="submit-hours-button"]')
      const submittingHoursButton = wrapper.find('[data-test="submitting-hours-button"]')
      expect(submittingHoursButton.exists()).toBeTruthy()
      expect(submitHoursButton.exists()).toBeFalsy()
    })
    it('should show action column if owner', async () => {
      let wrapper = createComponent({
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                user: { address: '0xOwner' }
              }
            })
          ]
        }
      })

      expect(wrapper.find('[data-test="action-th"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="action-td"]').exists()).toBeTruthy()
    })
    it('should hide action column if not owner', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="action-th"]').exists()).toBeFalsy()
      expect(wrapper.find('[data-test="action-td"]').exists()).toBeFalsy()
    })
  })
})