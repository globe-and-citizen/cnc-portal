import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { Abi, Address } from 'viem'
import ContractReadDataSection from '../ContractReadDataSection.vue'

const { mockUseContractReadData } = vi.hoisted(() => ({
  mockUseContractReadData: vi.fn()
}))

vi.mock('@/composables/contracts/useContractReadData', () => ({
  useContractReadData: mockUseContractReadData
}))

const stubs = {
  UAlert: {
    props: ['title', 'description'],
    template: '<div data-test="u-alert">{{ title }} {{ description }}<slot name="actions" /></div>'
  },
  UButton: {
    props: ['label'],
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>'
  },
  UEmpty: {
    props: ['title', 'description'],
    template: '<div v-bind="$attrs">{{ title }} {{ description }}</div>'
  },
  USkeleton: { template: '<div data-test="u-skeleton" />' },
  AddressToolTip: {
    props: ['address'],
    template: '<span data-test="read-address">{{ address }}</span>'
  }
}

const defaultProps = {
  address: '0x1234567890123456789012345678901234567890' as Address,
  abi: [] as Abi,
  contractType: 'Bank',
  enabled: true
}

function mountComponent(state: {
  data?: ReturnType<typeof ref>
  isPending?: ReturnType<typeof ref<boolean>>
  isFetching?: ReturnType<typeof ref<boolean>>
  isError?: ReturnType<typeof ref<boolean>>
  refetch?: ReturnType<typeof vi.fn>
}) {
  const query = {
    data: state.data ?? ref(undefined),
    isPending: state.isPending ?? ref(false),
    isFetching: state.isFetching ?? ref(false),
    isError: state.isError ?? ref(false),
    refetch: state.refetch ?? vi.fn()
  }
  mockUseContractReadData.mockReturnValue(query)

  return {
    wrapper: mount(ContractReadDataSection, { props: defaultProps, global: { stubs } }),
    query
  }
}

describe('ContractReadDataSection.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skeletons while contract reads are loading', () => {
    const { wrapper } = mountComponent({ isPending: ref(true), isFetching: ref(true) })

    expect(wrapper.find('[data-test="contract-data-loading"]').exists()).toBe(true)
  })

  it('renders successful values and reports partial failures', () => {
    const { wrapper } = mountComponent({
      data: ref({
        fields: [
          {
            functionName: 'owner',
            label: 'Owner',
            value: '0x9999999999999999999999999999999999999999',
            outputType: 'address',
            isAddress: true
          },
          {
            functionName: 'totalMembers',
            label: 'Total Members',
            value: '42',
            outputType: 'uint256',
            isAddress: false
          }
        ],
        failedCount: 1,
        totalCount: 3
      })
    })

    expect(wrapper.get('[data-test="read-address"]').text()).toContain('0x9999')
    expect(wrapper.get('[data-test="contract-data-values"]').text()).toContain('Total Members')
    expect(wrapper.get('[data-test="contract-data-values"]').text()).toContain('42')
    expect(wrapper.get('[data-test="contract-data-partial"]').text()).toContain(
      '1 value is unavailable'
    )
  })

  it('renders an empty state when the contract has no parameterless reads', () => {
    const { wrapper } = mountComponent({
      data: ref({ fields: [], failedCount: 0, totalCount: 0 })
    })

    expect(wrapper.get('[data-test="contract-data-empty"]').text()).toContain('No readable data')
  })

  it('renders an error state and retries the reads', async () => {
    const refetch = vi.fn()
    const { wrapper } = mountComponent({ isError: ref(true), refetch })

    expect(wrapper.get('[data-test="contract-data-error"]').text()).toContain(
      'Contract data could not be loaded'
    )
    await wrapper.get('[data-test="retry-contract-data"]').trigger('click')
    expect(refetch).toHaveBeenCalledOnce()
  })
})
