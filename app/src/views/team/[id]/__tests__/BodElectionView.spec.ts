import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import BodElectionView from '@/views/team/[id]/BodElectionView.vue'
import BodMembersSection from '@/components/sections/AdministrationView/BodMembersSection.vue'
import ElectionSummarySection from '@/components/sections/AdministrationView/ElectionSummarySection.vue'
import PastElectionsSection from '@/components/sections/AdministrationView/PastElectionsSection.vue'
import ContractOwnerCard from '@/components/ui/ContractOwnerCard.vue'
import { mockElectionsReads, mockLog, resetContractMocks } from '@/tests/mocks'

const MOCK_ELECTIONS_ADDRESS = '0x1234567890123456789012345678901234567890'

describe('BodElectionView.vue', () => {
  let wrapper: VueWrapper

  const mountComponent = () =>
    mount(BodElectionView, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          BodMembersSection: true,
          ElectionSummarySection: true,
          PastElectionsSection: true,
          ContractOwnerCard: true
        }
      }
    })

  const summarySection = () => wrapper.findComponent(ElectionSummarySection)

  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render the sections that do not depend on an election', () => {
      wrapper = mountComponent()

      expect(wrapper.findComponent(BodMembersSection).exists()).toBe(true)
      expect(wrapper.findComponent(PastElectionsSection).exists()).toBe(true)
    })

    it('should render ElectionSummarySection when nextElectionId exists', () => {
      mockElectionsReads.nextElectionId.data.value = 5n
      wrapper = mountComponent()

      expect(summarySection().exists()).toBe(true)
    })

    it('should not render ElectionSummarySection before nextElectionId arrives', () => {
      mockElectionsReads.nextElectionId.data.value = null
      wrapper = mountComponent()

      expect(summarySection().exists()).toBe(false)
    })

    it('should not render ElectionSummarySection when nextElectionId is 0', () => {
      mockElectionsReads.nextElectionId.data.value = 0n
      wrapper = mountComponent()

      expect(summarySection().exists()).toBe(false)
    })
  })

  describe('Elections Address Handling', () => {
    it('should pass the elections address to ContractOwnerCard', () => {
      wrapper = mountComponent()

      const contractOwnerCard = wrapper.findComponent(ContractOwnerCard)
      expect(contractOwnerCard.exists()).toBe(true)
      expect(contractOwnerCard.props('contractAddress')).toBe(MOCK_ELECTIONS_ADDRESS)
    })

    it('should not render ContractOwnerCard while the elections address is unknown', () => {
      mockElectionsReads.address.data.value = undefined
      wrapper = mountComponent()

      expect(wrapper.findComponent(ContractOwnerCard).exists()).toBe(false)
    })

    it('should render ContractOwnerCard once the team contracts land', async () => {
      mockElectionsReads.address.data.value = undefined
      wrapper = mountComponent()

      expect(wrapper.findComponent(ContractOwnerCard).exists()).toBe(false)

      mockElectionsReads.address.data.value = MOCK_ELECTIONS_ADDRESS
      await wrapper.vm.$nextTick()

      expect(wrapper.findComponent(ContractOwnerCard).exists()).toBe(true)
    })
  })

  describe('Election ID Computation', () => {
    it.each([
      ['bigint', 5n, 4n],
      ['number', 10, 9n],
      ['the first election', 1n, 0n],
      ['a large id', 1000000n, 999999n]
    ])('should compute the current election id from %s', (_case, nextId, expected) => {
      mockElectionsReads.nextElectionId.data.value = nextId
      wrapper = mountComponent()

      expect(summarySection().props('electionId')).toBe(expected)
    })
  })

  describe('Error Handling', () => {
    it('should not log when the read succeeds', async () => {
      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      expect(mockLog.error).not.toHaveBeenCalled()
    })

    it('should log a failed next-election-id read', async () => {
      wrapper = mountComponent()

      mockElectionsReads.nextElectionId.error.value = new Error('Contract not found')
      await wrapper.vm.$nextTick()

      expect(mockLog.error).toHaveBeenCalledWith(
        'Error fetching next election ID: ',
        expect.any(Error)
      )
    })

    it('should keep rendering the rest of the page when the read fails', () => {
      mockElectionsReads.nextElectionId.error.value = new Error('Contract not found')
      wrapper = mountComponent()

      expect(wrapper.findComponent(BodMembersSection).exists()).toBe(true)
      expect(wrapper.findComponent(PastElectionsSection).exists()).toBe(true)
    })
  })

  describe('Reactive Updates', () => {
    it('should follow nextElectionId as it changes', async () => {
      mockElectionsReads.nextElectionId.data.value = 5n
      wrapper = mountComponent()

      expect(summarySection().props('electionId')).toBe(4n)

      mockElectionsReads.nextElectionId.data.value = 10n
      await wrapper.vm.$nextTick()

      expect(summarySection().props('electionId')).toBe(9n)
    })

    it('should show the summary once an election id arrives', async () => {
      mockElectionsReads.nextElectionId.data.value = null
      wrapper = mountComponent()

      expect(summarySection().exists()).toBe(false)

      mockElectionsReads.nextElectionId.data.value = 3n
      await wrapper.vm.$nextTick()

      expect(summarySection().exists()).toBe(true)
      expect(summarySection().props('electionId')).toBe(2n)
    })
  })

  describe('Component Lifecycle', () => {
    it('should unmount without throwing', () => {
      mockElectionsReads.nextElectionId.data.value = 5n
      wrapper = mountComponent()

      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
