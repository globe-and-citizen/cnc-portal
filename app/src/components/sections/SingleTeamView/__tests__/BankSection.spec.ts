import { mount, enableAutoUnmount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import BankSection from '@/components/sections/SingleTeamView/BankSection.vue'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import type { Action, Team } from '@/types'
import type { ComponentPublicInstance } from 'vue'

interface BankSectionVM extends ComponentPublicInstance {
  tokenDepositModal: boolean
  tokenTransferModal: boolean
  tokenTipModal: boolean
  tokenAmount: string
  tokenAmountUSDC: string
  tokenRecipient: string
  usdcBalance: bigint | null
}

vi.mock('@/stores/user', () => ({
  useUserDataStore: vi.fn(() => ({
    address: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E'
  }))
}))

const team = {
  bankAddress: '0xd6307a4B12661a5254CEbB67eFA869E37d0421E6',
  ownerAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
  boardOfDirectorsAddress: '0xaFeF48F7718c51fb7C6d1B314B3991D2e1d8421E',
  members: []
}
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
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}
const mockUseAddAction = {
  loadingContract: ref(false),
  actionCount: ref<BigInt | null>(null),
  team: ref<Partial<Team> | null>(null),
  action: ref<Partial<Action> | null>(null),
  executeAddAction: vi.fn(),
  addAction: vi.fn(),
  isSuccess: ref(false),
  isConfirming: ref(false),
  error: ref(null)
}
vi.mock('@/composables/bod', async (importOriginal) => {
  const actual: Object = await importOriginal()
  return {
    ...actual,
    useAddAction: vi.fn(() => mockUseAddAction)
  }
})

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

describe('BankSection', () => {
  let wrapper: ReturnType<typeof mount<typeof BankSection>>
  setActivePinia(createPinia())

  enableAutoUnmount(afterEach)
  beforeEach(() => {
    wrapper = mount(BankSection, {
      props: {
        team
      }
    })
  })

  describe('Render', () => {
    it('should show team bank address', () => {
      expect(wrapper.find('[data-test="team-bank-address"]').exists()).toBeTruthy()
      expect(wrapper.find('[data-test="team-bank-address"]').text()).toContain(team.bankAddress)
    })

    it('should show USDC balance', () => {
      expect(wrapper.text()).toContain('USDC:')
    })

    it('should show USDC related buttons', () => {
      const buttons = wrapper.findAll('button')
      expect(buttons.some((button) => button.text().includes('Deposit USDC'))).toBeTruthy()
      expect(buttons.some((button) => button.text().includes('Transfer USDC'))).toBeTruthy()
      expect(buttons.some((button) => button.text().includes('Tip USDC'))).toBeTruthy()
    })
  })

  describe('Methods', () => {
    it('should bind the tip amount input correctly', async () => {
      const input = wrapper.find('input')
      await input.setValue('10')
      expect(input.element.value).toBe('10')
    })

    it('should open token deposit modal on button click', async () => {
      const depositButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Deposit USDC'))
      await depositButton?.trigger('click')
      expect((wrapper.vm as unknown as BankSectionVM).tokenDepositModal).toBe(true)
    })

    it('should open token transfer modal on button click', async () => {
      const transferButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Transfer USDC'))
      await transferButton?.trigger('click')
      expect((wrapper.vm as unknown as BankSectionVM).tokenTransferModal).toBe(true)
    })

    it('should open token tip modal on button click', async () => {
      const tipButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Tip USDC'))
      await tipButton?.trigger('click')
      expect((wrapper.vm as unknown as BankSectionVM).tokenTipModal).toBe(true)
    })

    it('should bind token amount input correctly in tip modal', async () => {
      const tipButton = wrapper
        .findAll('button')
        .find((button) => button.text().includes('Tip USDC'))
      await tipButton?.trigger('click')
      const input = wrapper.find('input[placeholder="Enter amount"]')
      await input.setValue('25')
      expect((wrapper.vm as unknown as BankSectionVM).tokenAmountUSDC).toBe(25)
    })

    it('should handle USDC balance updates', async () => {
      mockUseReadContract.data.value = '1000000' // 1 USDC (6 decimals)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('USDC: 1')
    })
  })
})
