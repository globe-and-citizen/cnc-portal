import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSiwe } from '@/composables/useSiwe'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import {
  mockUseWalletChecks,
  mockUseSignMessage,
  mockUseConnect,
  mockUseChainId
} from '@/tests/mocks'

describe('useSiwe', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUseConnect.connectors = [{ name: 'MetaMask', getChainId: () => 31137 }]
    mockUseChainId.value = 123
    mockUseWalletChecks.performChecks.mockImplementation(() => true)
    mockUseWalletChecks.performChecks.mockImplementation(
      () => (mockUseWalletChecks.isSuccess.value = true)
    )
  })
  afterEach(() => {
    vi.clearAllMocks()
    mockUseSignMessage.data.value = undefined
    mockUseWalletChecks.isSuccess.value = false
  })
  it('should update isProcessing to false if checks failed', async () => {
    mockUseWalletChecks.performChecks.mockReset()
    mockUseWalletChecks.performChecks.mockImplementation(() => false)
    const { isProcessing, siwe } = useSiwe()
    await siwe()
    await flushPromises()
    expect(isProcessing.value).toBe(false)
  })
})
