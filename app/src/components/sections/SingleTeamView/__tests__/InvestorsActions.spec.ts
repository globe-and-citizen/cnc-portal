import { describe, expect, it, vi } from 'vitest'
import InvestorsActions from '@/components/sections/SingleTeamView/InvestorsActions.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { parseEther, type Address } from 'viem'
import ModalComponent from '@/components/ModalComponent.vue'
import { useToastStore } from '@/stores/__mocks__/useToastStore'

vi.mock('@/stores/useToastStore')
vi.mock('@/stores/user')

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
  isSuccess: ref(false)
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
  const actual: Object = await importOriginal()
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
      bankAddress: '0x123',
      members: [],
      ownerAddress: '0xOwner',
      votingAddress: '0x123',
      investorsAddress: '0x123',
      boardOfDirectorsAddress: '0x123'
    },
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
    return mount(InvestorsActions, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      props
    })
  }

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

  it('should call mintToken when MintForm emit submit event', async () => {
    const wrapper = createComponent()

    await wrapper.find('button[data-test="mint-button"]').trigger('click')
    await wrapper.vm.$nextTick()

    const mintForm = wrapper.findComponent({ name: 'MintForm' })
    mintForm.vm.$emit('submit', '0x123', '100')

    expect(mockUseWriteContract.writeContract).toHaveBeenCalled()
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

  it('should add error toast when mintToken failed', async () => {
    const { addErrorToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).mintError = 'Mint failed'
    await wrapper.vm.$nextTick()

    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should add error toast when distributeMint failed', async () => {
    const { addErrorToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).distributeMintError = 'Distribute mint failed'
    await wrapper.vm.$nextTick()

    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should add error toast when payDividends failed', async () => {
    const { addErrorToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).payDividendsError = 'Pay dividends failed'
    await wrapper.vm.$nextTick()

    expect(addErrorToast).toHaveBeenCalled()
  })

  it('should add success toast when mintToken success', async () => {
    const { addSuccessToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).isConfirmingMint = true
    ;(wrapper.vm as unknown as ComponentData).isSuccessMinting = true
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as ComponentData).isConfirmingMint = false
    await wrapper.vm.$nextTick()

    expect(addSuccessToast).toHaveBeenCalled()
    expect(wrapper.emitted('refetchShareholders')).toBeTruthy()
    expect((wrapper.vm as unknown as ComponentData).mintModal).toBeFalsy()
  })

  it('should add success toast when distributeMint success', async () => {
    const { addSuccessToast } = useToastStore()
    const wrapper = createComponent()

    ;(wrapper.vm as unknown as ComponentData).isConfirmingDistributeMint = true
    ;(wrapper.vm as unknown as ComponentData).isSuccessDistributeMint = true
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as ComponentData).isConfirmingDistributeMint = false
    await wrapper.vm.$nextTick()

    expect(addSuccessToast).toHaveBeenCalled()
    expect(wrapper.emitted('refetchShareholders')).toBeTruthy()
    expect((wrapper.vm as unknown as ComponentData).distributeMintModal).toBeFalsy()
  })

  it('should add success toast when payDividends success', async () => {
    const { addSuccessToast } = useToastStore()
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
