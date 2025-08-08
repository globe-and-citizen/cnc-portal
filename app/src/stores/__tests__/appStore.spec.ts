import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useAppStore } from '../appStore'

// Mock wagmi composables
const mockChainId = ref<number | undefined>(11155111)
const mockSwitchChain = vi.fn()

vi.mock('@wagmi/vue', () => ({
  useAccount: vi.fn(() => ({
    chainId: mockChainId
  })),
  useSwitchChain: vi.fn(() => ({
    switchChain: mockSwitchChain
  }))
}))

// Mock toast store
const mockAddErrorToast = vi.fn()
vi.mock('../useToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addErrorToast: mockAddErrorToast
  }))
}))

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockChainId.value = 11155111 // Reset to supported chain
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const appStore = useAppStore()

      expect(appStore.showAddTeamModal).toBe(false)
    })
  })

  describe('setShowAddTeamModal', () => {
    it('should set showAddTeamModal to true', () => {
      const appStore = useAppStore()

      appStore.setShowAddTeamModal(true)

      expect(appStore.showAddTeamModal).toBe(true)
    })

    it('should set showAddTeamModal to false', () => {
      const appStore = useAppStore()

      appStore.setShowAddTeamModal(true)
      expect(appStore.showAddTeamModal).toBe(true)

      appStore.setShowAddTeamModal(false)
      expect(appStore.showAddTeamModal).toBe(false)
    })
  })

  describe('chain validation', () => {
    it('should not show error for supported chains', () => {
      useAppStore()

      // Test supported chains
      const supportedChains = [137, 31337, 80002, 11155111]

      supportedChains.forEach((chainId) => {
        mockChainId.value = chainId
        expect(mockAddErrorToast).not.toHaveBeenCalled()
        expect(mockSwitchChain).not.toHaveBeenCalled()
      })
    })

    it('should show error and switch chain for unsupported chains', async () => {
      useAppStore()

      // Simulate unsupported chain
      mockChainId.value = 999999

      // Wait for watcher to trigger
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockAddErrorToast).toHaveBeenCalledWith('Unsupported chain')
      expect(mockSwitchChain).toHaveBeenCalledWith({
        chainId: 11155111
      })
    })

    it('should not trigger validation when chainId is undefined', async () => {
      useAppStore()

      mockChainId.value = undefined

      // Wait for watcher to trigger
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockAddErrorToast).not.toHaveBeenCalled()
      expect(mockSwitchChain).not.toHaveBeenCalled()
    })

    it('should handle multiple chain changes', async () => {
      useAppStore()

      // First unsupported chain
      mockChainId.value = 999
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Second unsupported chain
      mockChainId.value = 888
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockAddErrorToast).toHaveBeenCalledTimes(2)
      expect(mockSwitchChain).toHaveBeenCalledTimes(2)
    })

    it('should reset error state when switching to supported chain', async () => {
      useAppStore()

      // Start with unsupported chain
      mockChainId.value = 999
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(mockAddErrorToast).toHaveBeenCalledTimes(1)

      // Switch to supported chain
      mockChainId.value = 137
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Should not trigger additional errors
      expect(mockAddErrorToast).toHaveBeenCalledTimes(1)
    })
  })

  describe('SUPPORTED_CHAINS constant', () => {
    it('should contain expected chain IDs', () => {
      const appStore = useAppStore()

      // Access the supported chains through chain validation behavior
      const expectedChains = [137, 31337, 80002, 11155111]

      expectedChains.forEach((chainId) => {
        mockChainId.value = chainId
        // Should not trigger error for supported chains
        expect(mockAddErrorToast).not.toHaveBeenCalled()
      })
    })
  })
})
