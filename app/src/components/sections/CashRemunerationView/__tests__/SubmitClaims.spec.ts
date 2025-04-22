import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SubmitClaims from '../SubmitClaims.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

const errorToastMock = vi.fn()
const successToastMock = vi.fn()
vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useTeamStore: vi.fn(() => ({
      currentTeam: {
        id: 1
      }
    })),
    useToastStore: vi.fn(() => ({
      addErrorToast: errorToastMock,
      addSuccessToast: successToastMock
    }))
  }
})

const statusCodeMock = ref(200)
const errorMock = ref<unknown>(null)
vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCustomFetch: vi.fn(() => ({
      post: vi.fn(() => ({
        json: vi.fn(() => ({
          statusCode: statusCodeMock,
          error: errorMock
        }))
      }))
    }))
  }
})

describe('SubmitClaims', () => {
  const createComponent = () => {
    return shallowMount(SubmitClaims, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  it('should render correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should show success toast on successful claim submission', async () => {
    const wrapper = createComponent()
    statusCodeMock.value = 201
    await wrapper.vm.$nextTick()

    expect(successToastMock).toHaveBeenCalled()
  })

  it('should show error toast on failed claim submission', async () => {
    const wrapper = createComponent()
    statusCodeMock.value = 400
    errorMock.value = { message: 'Error' }
    await wrapper.vm.$nextTick()

    expect(errorToastMock).toHaveBeenCalled()
  })
})
