import { afterEach, describe, expect, it, vi } from 'vitest'
import InvestorsActions from '@/components/sections/SherTokenView/InvestorsActions.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { parseEther, type Address } from 'viem'
import ModalComponent from '@/components/ModalComponent.vue'
// import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { mockToastStore } from '@/tests/mocks/store.mock'
import type { Team } from '@/types/team'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { WagmiPlugin, createConfig, http } from '@wagmi/vue'
import { mainnet } from 'viem/chains'
// vi.mock('@/stores/useToastStore')
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
})

vi.mock('@/stores/user')

const { addErrorToast, addSuccessToast } = mockToastStore

const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(false),
  data: ref(undefined),
  error: ref(null)
}
const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref(false),
  data: ref<string>(''),
  sendTransaction: vi.fn()
}
const mockUseBalance = {
  data: ref<bigint | null>(parseEther('100')),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}
// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useSendTransaction: vi.fn(() => mockUseSendTransaction),
    useBalance: vi.fn(() => mockUseBalance)
  }
})

interface ComponentData {
  distributeMintModal: boolean
  payDividendsModal: boolean
  mintModal: boolean
  mintError: unknown
  distributeMintError: unknown
  payDividendsError: unknown
  isConfirmingMint: boolean
  isSuccessMinting: boolean
  isConfirmingDistributeMint: boolean
  isSuccessDistributeMint: boolean
  isConfirmingPayDividends: boolean
  isSuccessPayDividends: boolean
}

describe('InvestorsActions.vue', () => {
  const props = {
    team: {
      id: '1',
      name: 'Team 1',
      description: 'Team 1 Description',
      teamContracts: [
        {
          address: '0xcontractaddress',
          admins: [],
          type: 'Bank',
          deployer: '0xdeployeraddress'
        },
        {
          address: '0xcontractaddress',
          admins: [],
          type: 'Voting',
          deployer: '0xdeployeraddress'
        },
        {
          address: '0xcontractaddress',
          admins: [],
          type: 'InvestorsV1',
          deployer: '0xdeployeraddress'
        },
        {
          address: '0xcontractaddress',
          admins: [],
          type: 'BoardOfDirectors',
          deployer: '0xdeployeraddress'
        }
      ],
      members: [],
      ownerAddress: '0xOwner'
    } as Team,
    tokenSymbol: 'ETH',
    tokenSymbolLoading: false,
    shareholders: [
      {
        shareholder: '0x123' as Address,
        amount: parseEther('100')
      }
    ] as ReadonlyArray<{ shareholder: Address; amount: bigint }> | undefined
  }
  const createComponent = () => {
    const queryClient = new QueryClient() // Create a QueryClient instance

    return mount(InvestorsActions, {
      global: {
        plugins: [
          createTestingPinia({ createSpy: vi.fn }),
          [WagmiPlugin, { config: wagmiConfig }],
          [VueQueryPlugin, { queryClient }] // Add VueQueryPlugin with QueryClient
        ]
      },
      props
    })
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should open distributeMintModal if distribute mint button clicked', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="distribute-mint-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).distributeMintModal).toBeTruthy()
  })

  it('should open payDividendsModal if pay dividends button clicked', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="pay-dividends-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).payDividendsModal).toBeTruthy()
  })

  it('should open mintModal if mint button clicked', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="mint-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).mintModal).toBeTruthy()
  })

  it('should emit mint modal component v-model', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="mint-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    // console.log(wrapper.findComponent(MintForm).exists())

    expect((wrapper.vm as unknown as ComponentData).mintModal).toBeTruthy()

    const modalComponent = wrapper.findComponent(ModalComponent)
    modalComponent.vm.$emit('update:modelValue', false)

    expect((wrapper.vm as unknown as ComponentData).mintModal).toBeFalsy()
  })

  it('should emit distribute mint modal component v-model', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="distribute-mint-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).distributeMintModal).toBeTruthy()

    const modalComponent = wrapper.findAllComponents(ModalComponent)[1]
    modalComponent.vm.$emit('update:modelValue', false)

    expect((wrapper.vm as unknown as ComponentData).distributeMintModal).toBeFalsy()
  })

  it('should emit modal component v-model', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="pay-dividends-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect((wrapper.vm as unknown as ComponentData).payDividendsModal).toBeTruthy()

    const modalComponent = wrapper.findAllComponents(ModalComponent)[2]
    modalComponent.vm.$emit('update:modelValue', false)

    expect((wrapper.vm as unknown as ComponentData).payDividendsModal).toBeFalsy()
  })

  it('should call distributeMint when DistributeMintForm emit submit event', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="distribute-mint-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    const mintForm = wrapper.findComponent({ name: 'DistributeMintForm' })
    mintForm.vm.$emit('submit', '0x123', '100')

    expect(mockUseWriteContract.writeContract).toHaveBeenCalled()
  })

  it('should call payDividends when PayDividendsForm emit submit event', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="pay-dividends-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    const mintForm = wrapper.findComponent({ name: 'PayDividendsForm' })
    mintForm.vm.$emit('submit', '100')

    expect(mockUseWriteContract.writeContract).toHaveBeenCalled()
  })

  it('should add error toast when distributeMint failed', async () => {
    // const { addErrorToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).distributeMintError = 'Distribute mint failed'
    await wrapper.vm.$nextTick()

    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should add error toast when payDividends failed', async () => {
    // const { addErrorToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).payDividendsError = 'Pay dividends failed'
    await wrapper.vm.$nextTick()

    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should add success toast when payDividends success', async () => {
    // const { addSuccessToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).isConfirmingPayDividends = true
    ;(wrapper.vm as unknown as ComponentData).isSuccessPayDividends = true
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as ComponentData).isConfirmingPayDividends = false
    await wrapper.vm.$nextTick()

    expect(addSuccessToast).toHaveBeenCalled()
    expect((wrapper.vm as unknown as ComponentData).payDividendsModal).toBeFalsy()
  })
})
