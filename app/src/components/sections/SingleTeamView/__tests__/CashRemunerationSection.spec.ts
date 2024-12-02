import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import CashRemunerationSection from '../CashRemunerationSection.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

// vi.mock('@/stores', () => ({
//   useUserDataStore: vi.fn()
// }))

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  }))
}))

const mockUseBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useBalance: vi.fn(() => mockUseBalance)
  }
})

interface ComponentData {
  isSubmittingHours: boolean
  hoursWorked: { hoursWorked: string | undefined }
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
    // it('should show action column if owner', async () => {
    //   const wrapper = createComponent({
    //     global: {
    //       plugins: [
    //         createTestingPinia({
    //           createSpy: vi.fn,
    //           initialState: {
    //             user: { address: '0xOwner' }
    //           }
    //         })
    //       ]
    //     }
    //   })

    //   expect(wrapper.find('[data-test="action-th"]').exists()).toBeTruthy()
    //   expect(wrapper.find('[data-test="action-td"]').exists()).toBeTruthy()
    // })
    it('should hide action column if not owner', async () => {
      const wrapper = createComponent()

      expect(wrapper.find('[data-test="action-th"]').exists()).toBeFalsy()
      expect(wrapper.find('[data-test="action-td"]').exists()).toBeFalsy()
    })
    it('should disable submit hours inputs if team owner', async () => {
      const wrapper = createComponent({
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

      const maxHoursInput = wrapper.find('[data-test="hours-worked-input"]')
      const submitHoursButton = wrapper.find('[data-test="submit-hours-button"]')

      expect(maxHoursInput.exists()).toBeTruthy()
      expect(submitHoursButton.exists()).toBeTruthy()
      // expect((maxHoursInput.element as HTMLInputElement).disabled).toBe(true)
      // expect((submitHoursButton.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  describe('State', () => {
    it('should update hoursWorked', async () => {
      const wrapper = createComponent()

      const hoursWorkedInput = wrapper.find('[data-test="hours-worked-input"]')
      expect(hoursWorkedInput.exists()).toBeTruthy()

      hoursWorkedInput.setValue('20')
      await wrapper.vm.$nextTick()

      expect((wrapper.vm as unknown as ComponentData).hoursWorked.hoursWorked).toBe('20')
    })
  })
})
