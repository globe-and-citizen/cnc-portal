import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import CashRemunerationTable from '../CashRemunerationTable.vue'
import { createTestingPinia } from '@pinia/testing'
import { ref } from 'vue'

const errorMock = ref<unknown>(undefined)
const mockFetch = vi.fn()
vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCustomFetch: vi.fn(() => ({
      json: vi.fn(() => ({
        data: ref([
          {
            id: 1,
            hoursWorked: 20,
            wage: {
              cashRatePerHour: 1,
              user: {
                address: '0x123',
                name: 'John Doe'
              }
            },
            status: 'pending',
            cashRemunerationSignature: null,
            createdAt: '2021-09-01',
            address: ' 0x123'
          },
          {
            id: 2,
            hoursWorked: 10,
            wage: {
              cashRatePerHour: 1,
              user: {
                address: '0x123',
                name: 'John Doe'
              }
            },
            status: 'approved',
            cashRemunerationSignature: '0x123',
            createdAt: '2021-09-02',
            address: ' 0x456'
          }
        ]),
        error: errorMock,
        execute: mockFetch,
        isFetching: ref(false)
      }))
    }))
  }
})

const mockErrorToast = vi.fn()
vi.mock('@/stores', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useCurrencyStore: vi.fn(() => ({
      localCurrency: ref({
        code: 'USD',
        symbol: '$'
      }),
      nativeToken: ref({
        priceInLocal: 1000
      })
    })),
    useToastStore: vi.fn(() => ({
      addErrorToast: mockErrorToast
    }))
  }
})

interface ComponentData {
  statusUrl: string
}

describe('CashRemunerationTable', () => {
  const createComponent = () => {
    return shallowMount(CashRemunerationTable, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      stubs: {
        CRSigne: {
          name: 'CRSigne',
          template: '<div />'
        },
        CRWithdrawClaim: {
          name: 'CRWithdrawClaim',
          template: '<div />'
        }
      }
    })
  }

  it('renders correctly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should emits fetchClaims when radio button changed', async () => {
    const wrapper = createComponent()
    const radio = wrapper.find('input[data-test="radio-pending"]')

    await radio.trigger('change')
    expect(mockFetch).toHaveBeenCalled()
  })

  it('calls fetchTeamClaimData when SubmitClaims emits refetch-claims', async () => {
    const wrapper = createComponent()
    const submitClaimsStub = wrapper.findComponent({ name: 'SubmitClaims' })

    await submitClaimsStub.vm.$emit('refetch-claims')
    expect(mockFetch).toHaveBeenCalled()
  })
  it('computes statusUrl correctly when selectedRadio is "all"', () => {
    const wrapper = createComponent()
    expect((wrapper.vm as unknown as ComponentData).statusUrl).toBe('')
  })

  it('computes statusUrl correctly when selectedRadio is "pending"', async () => {
    const wrapper = createComponent()
    const radio = wrapper.find('input[data-test="radio-pending"]')
    await radio.setValue()
    expect((wrapper.vm as unknown as ComponentData).statusUrl).toBe('&status=pending')
  })

  it('shows error toast when error occurs', async () => {
    errorMock.value = new Error('Test error')
    const wrapper = createComponent()

    await wrapper.vm.$nextTick()
    expect(mockErrorToast).toHaveBeenCalledWith('Failed to fetch team wage data')
  })
})
