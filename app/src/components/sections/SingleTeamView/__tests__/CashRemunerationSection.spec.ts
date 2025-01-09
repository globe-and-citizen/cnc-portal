import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import CashRemunerationSection from '../CashRemunerationSection.vue'
import { createPinia, setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import type { Team } from '@/types'
import ButtonUI from '@/components/ButtonUI.vue'

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

const mockUseSignTypedData = {
  data: ref<`0x{string}` | null>(null),
  signTypedData: vi.fn()
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useBalance: vi.fn(() => mockUseBalance),
    useChainId: vi.fn(() => 123),
    useSignTypedData: vi.fn(() => mockUseSignTypedData)
  }
})

interface ComponentData {
  isSubmittingHours: boolean
  hoursWorked: { hoursWorked: string | undefined }
  currentUserAddress: string
  team: Partial<Team>
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
    it('should load when submitting hours', async () => {
      const wrapper = createComponent()

      ;(wrapper.vm as unknown as ComponentData).isSubmittingHours = true
      await wrapper.vm.$nextTick()

      const submitHoursButton = wrapper
        .find('[data-test="submit-hours-button"]')
        .findComponent(ButtonUI)
      expect(submitHoursButton.props().loading).toBe(true)
    })
    it('should show action column if owner', async () => {
      vi.mock('@/composables/useCustomFetch', () => {
        return {
          useCustomFetch: vi.fn(() => {
            const data = ref<unknown>(null)
            const error = ref(null)
            const isFetching = ref(false)

            const execute = vi.fn(() => {
              data.value = [
                {
                  id: 1,
                  createdAt: '2024-02-02T12:00:00Z',
                  address: '0xUserToApprove',
                  hoursWorked: 20,
                  hourlyRate: '17.5',
                  name: 'Local 1'
                }
              ]
            })

            const get = vi.fn(() => ({ get, json, execute, data, error, isFetching /*response*/ }))
            const json = vi.fn(() => ({ get, json, execute, data, error, isFetching /*response*/ }))
            const post = vi.fn(() => ({ get, json, execute, data, error, isFetching /*response*/ }))
            const put = vi.fn(() => ({ get, json, execute, data, error, isFetching /*response*/ }))

            return {
              post,
              get,
              put,
              json,
              error,
              isFetching,
              execute,
              data /*,
              response*/
            }
          })
        }
      })
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

      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="action-th"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="action-td"]').exists()).toBeTruthy()
    })
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
    })
    it('should display hours worked error if input is invalid', async () => {
      const wrapper = createComponent()

      const hoursWorkedInput = wrapper.find('[data-test="hours-worked-input"]')
      const submitHoursButton = wrapper.find('[data-test="submit-hours-button"]')

      expect(hoursWorkedInput.exists()).toBeTruthy()
      expect(submitHoursButton.exists()).toBeTruthy()

      await submitHoursButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="hours-worked-error"]').exists()).toBeTruthy()
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
