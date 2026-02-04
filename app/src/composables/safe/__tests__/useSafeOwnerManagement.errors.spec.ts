import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mocks, MOCK_DATA, setupDefaultMocks } from './useSafeOwnerManagement.test-utils'
import { useSafeOwnerManagement } from '../useSafeOwnerManagement'

const {
  mockUseConnection,
  mockUseChainId,
  mockLoadSafe,
  mockSafeSdk,
  mockProposeMutation,
  mockAddErrorToast
} = mocks

describe('useSafeOwnerManagement - errors and edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  describe('Error Handling', () => {
    it('handles Safe SDK loading errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const sdkError = new Error('Safe SDK initialization failed')
      mockLoadSafe.mockRejectedValue(sdkError)

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Safe SDK initialization failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Safe SDK initialization failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Owner management error:', sdkError)

      consoleErrorSpy.mockRestore()
    })

    it('handles transaction creation errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const txError = new Error('Transaction creation failed')
      mockSafeSdk.createAddOwnerTx.mockRejectedValue(txError)

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Transaction creation failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Transaction creation failed')

      consoleErrorSpy.mockRestore()
    })

    it('handles proposal submission errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const proposalError = new Error('Network request failed')
      mockProposeMutation.mutateAsync.mockRejectedValue(proposalError)

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Network request failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Network request failed')

      consoleErrorSpy.mockRestore()
    })

    it('handles execution errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const executionError = new Error('Execution failed')
      mockSafeSdk.executeTransaction.mockRejectedValue(executionError)

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: false
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Execution failed')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Execution failed')

      consoleErrorSpy.mockRestore()
    })

    it('handles unknown error types', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockLoadSafe.mockRejectedValue('Unknown error')

      const { updateOwners, error } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(error.value?.message).toBe('Failed to update Safe owners')
      expect(mockAddErrorToast).toHaveBeenCalledWith('Failed to update Safe owners')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('manages loading state during proposal', async () => {
      let resolveProposal: () => void
      const proposalPromise = new Promise<void>((resolve) => {
        resolveProposal = resolve
      })

      mockProposeMutation.mutateAsync.mockReturnValue(proposalPromise)

      const { updateOwners, isUpdating } = useSafeOwnerManagement()

      const updatePromise = updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(isUpdating.value).toBe(true)

      resolveProposal!()
      await updatePromise

      expect(isUpdating.value).toBe(false)
    })

    it('clears loading state even when errors occur', async () => {
      mockLoadSafe.mockRejectedValue(new Error('Test error'))

      const { updateOwners, isUpdating } = useSafeOwnerManagement()

      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(isUpdating.value).toBe(false)
    })
  })

  describe('Return Value Structure', () => {
    it('returns expected properties', () => {
      const result = useSafeOwnerManagement()

      expect(result).toHaveProperty('updateOwners')
      expect(result).toHaveProperty('isUpdating')
      expect(result).toHaveProperty('error')
      expect(typeof result.updateOwners).toBe('function')
      expect(result.isUpdating.value).toBe(false)
      expect(result.error.value).toBe(null)
    })
  })

  describe('Edge Cases', () => {
    it('handles missing address in connection', async () => {
      mockUseConnection.mockReturnValue({
        isConnected: ref(true),
        address: ref(null)
      })

      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(result).toBeNull()
      expect(mockAddErrorToast).toHaveBeenCalledWith('Please connect your wallet')
    })

    it('handles consecutive operations', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result1 = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })
      expect(result1).toBe(MOCK_DATA.txHash)

      const result2 = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToRemove: [MOCK_DATA.existingOwner],
        shouldPropose: true
      })
      expect(result2).toBe(MOCK_DATA.txHash)

      expect(mockProposeMutation.mutateAsync).toHaveBeenCalledTimes(2)
    })

    it('resets error state on new operation attempt', async () => {
      mockLoadSafe.mockRejectedValueOnce(new Error('First error'))

      const { updateOwners, error } = useSafeOwnerManagement()
      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(error.value?.message).toBe('First error')

      mockLoadSafe.mockResolvedValue(mockSafeSdk)

      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(error.value).toBe(null)
    })

    it('handles different chain IDs correctly', async () => {
      mockUseChainId.mockReturnValue(ref(42161))

      const { updateOwners } = useSafeOwnerManagement()

      await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner],
        shouldPropose: true
      })

      expect(mockProposeMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: 42161
        })
      )
    })
  })

  describe('Complex Ownership Scenarios', () => {
    it('handles complex multi-step ownership changes', async () => {
      const { updateOwners } = useSafeOwnerManagement()

      const result = await updateOwners(MOCK_DATA.validSafeAddress, {
        ownersToAdd: [MOCK_DATA.newOwner, '0x4444444444444444444444444444444444444444'],
        ownersToRemove: [MOCK_DATA.existingOwner],
        newThreshold: 2,
        shouldPropose: true
      })

      expect(result).toBe(MOCK_DATA.txHash)
      expect(mockSafeSdk.createAddOwnerTx).toHaveBeenCalledTimes(2)
      expect(mockSafeSdk.createRemoveOwnerTx).toHaveBeenCalledTimes(1)
    })
  })
})
