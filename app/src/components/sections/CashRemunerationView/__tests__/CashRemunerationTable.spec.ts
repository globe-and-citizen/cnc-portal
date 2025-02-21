import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CashRemunerationTable from '../CashRemunerationTable.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'
import { useUserDataStore } from '@/stores/__mocks__/user'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

const signClaimMock = vi.fn()
const withdrawMock = vi.fn()
const withdrawSuccess = ref(false)
const withdrawalLoading = ref(false)
vi.mock('@/composables/useClaim', () => {
  return {
    useWithdrawClaim: vi.fn(() => ({
      execute: withdrawMock,
      isLoading: withdrawalLoading,
      error: ref(undefined),
      isSuccess: withdrawSuccess
    })),
    useSignWageClaim: vi.fn(() => ({
      execute: signClaimMock,
      isLoading: ref(false),
      signature: ref(undefined)
    }))
  }
})

const statusCodeMock = ref<number | undefined>(undefined)
const errorMock = ref<unknown>(undefined)
vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCustomFetch: vi.fn(() => ({
      get: vi.fn(() => ({
        json: vi.fn(() => ({
          data: ref({}),
          error: ref(undefined),
          execute: vi.fn(),
          isFetching: ref(false)
        }))
      })),
      json: vi.fn(() => ({
        data: ref({}),
        error: ref(undefined),
        execute: vi.fn(),
        isFetching: ref(false)
      })),
      put: vi.fn(() => ({
        json: vi.fn(() => ({
          error: errorMock,
          execute: vi.fn(),
          loading: ref(false),
          statusCode: statusCodeMock
        }))
      }))
    }))
  }
})

vi.mock('@/stores/user')
vi.mock('@/stores/useToastStore')

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 1
    }
  }))
}))

interface ComponentData {
  withdrawLoading: {
    [key: string]: boolean
  }
}

describe('CashRemunerationTable', () => {
  const createComponent = () => {
    return mount(CashRemunerationTable, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      props: {
        claims: [
          {
            id: 1,
            hourlyRate: '10',
            hoursWorked: 20,
            name: 'John Doe',
            status: 'pending',
            cashRemunerationSignature: null,
            createdAt: '2021-09-01',
            address: ' 0x123'
          },
          {
            id: 2,
            hourlyRate: '20',
            hoursWorked: 10,
            name: null,
            status: 'approved',
            cashRemunerationSignature: '0x123',
            createdAt: '2021-09-02',
            address: ' 0x456'
          }
        ],
        isLoading: false,
        ownerAddress: '0x123'
      }
    })
  }
  it('should be able to see and click approve button when current user is the owner', async () => {
    const userStore = useUserDataStore()
    userStore.address = '0x123'
    const wrapper = createComponent()
    const button = wrapper.find('[data-test="approve-button"]')

    statusCodeMock.value = 200
    expect(button.exists()).toBeTruthy()
    await button.trigger('click')

    expect(signClaimMock).toHaveBeenCalled()
    expect(wrapper.emitted('fetchClaims')).toBeTruthy()
  })

  it('should be able to see and click withdraw button when current user is the claim owner', async () => {
    const userStore = useUserDataStore()
    userStore.address = '0x123'
    const wrapper = createComponent()
    const button = wrapper.find('[data-test="withdraw-button"]')

    expect(button.exists()).toBeTruthy()
    await button.trigger('click')

    expect(withdrawMock).toHaveBeenCalled()
    withdrawSuccess.value = true
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('fetchClaims')).toBeTruthy()
  })

  it('should show error if add approval error', async () => {
    const { addErrorToast } = useToastStore()
    const wrapper = createComponent()
    const button = wrapper.find('[data-test="approve-button"]')

    await button.trigger('click')
    errorMock.value = new Error('Error')
    await wrapper.vm.$nextTick()

    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should emits fetchClaims when radio button changed', async () => {
    const wrapper = createComponent()
    const radio = wrapper.find('input[data-test="radio-pending"]')

    await radio.trigger('change')
    expect(wrapper.emitted('fetchClaims')).toBeTruthy()
  })

  it('should set withdrawLoading correctly', async () => {
    const wrapper = createComponent()
    const button = wrapper.find('[data-test="withdraw-button"]')

    await button.trigger('click')
    withdrawalLoading.value = true
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).withdrawLoading['2']).toBe(true)
  })
})
