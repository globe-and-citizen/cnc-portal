import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SubmitClaims from '../SubmitClaims.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

const statusCodeMock = ref<number | undefined>(undefined)
const errorMock = ref<unknown>(undefined)
vi.mock('@/composables/useCustomFetch', (importOriginal) => {
  const original = importOriginal()
  return {
    ...original,
    useCustomFetch: vi.fn(() => ({
      post: () => ({
        json: () => ({
          execute: vi.fn(),
          data: {
            success: true
          },
          loading: ref(false),
          error: errorMock,
          statusCode: statusCodeMock
        })
      })
    }))
  }
})

vi.mock('@/stores/useToastStore')

interface ComponentData {
  hoursWorked: { hoursWorked: string }
}

describe.skip('SubmitClaims', () => {
  const createComponent = () => {
    return mount(SubmitClaims, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }
  it('should input hours worked correctly', async () => {
    const wrapper = createComponent()

    await wrapper.find('input[data-test="hours-worked-input"]').setValue('20')
    expect((wrapper.vm as unknown as ComponentData).hoursWorked.hoursWorked).toBe('20')
  })

  it('shows error when hours worked is invalid', async () => {
    const wrapper = createComponent()

    // case 1: hours worked is empty
    await wrapper.find('input[data-test="hours-worked-input"]').setValue('')
    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')
    expect(wrapper.find('[data-test="hours-worked-error"]').exists()).toBe(true)

    // case 2: hours worked is not a number
    await wrapper.find('input[data-test="hours-worked-input"]').setValue('a')
    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')
    expect(wrapper.find('[data-test="hours-worked-error"]').exists()).toBe(true)
  })

  it('shows success toast when submit hours worked successfully', async () => {
    const wrapper = createComponent()
    const { addSuccessToast } = useToastStore()

    await wrapper.find('input[data-test="hours-worked-input"]').setValue('20')
    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')
    statusCodeMock.value = 201
    await wrapper.vm.$nextTick()
    expect(addSuccessToast).toHaveBeenCalledWith('Wage claim added successfully')
  })

  it('shows error toast when submit worked failed', async () => {
    const wrapper = createComponent()
    const { addErrorToast } = useToastStore()

    await wrapper.find('input[data-test="hours-worked-input"]').setValue('20')
    await wrapper.find('[data-test="submit-claim-button"]').trigger('click')
    errorMock.value = new Error('Error')
    await wrapper.vm.$nextTick()
    expect(addErrorToast).toHaveBeenCalledWith(errorMock.value)
  })
})
