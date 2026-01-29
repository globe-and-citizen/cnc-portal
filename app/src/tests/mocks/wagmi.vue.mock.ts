import { vi } from 'vitest'
import { ref } from 'vue'

// Shared transfer hash ref for transaction tracking
export const transferHash = ref<string | undefined>(undefined)

export const mockUseReadContract = {
  data: ref('0xData'),
  error: ref(null)
}

export const mockUseSignTypedData = {
  data: ref('0xSignature'),
  signTypedDataAsync: vi.fn(() => console.log('signTypedDataAsync mock called...'))
}

export const mockUseWriteContract = {
  data: transferHash,
  writeContractAsync: vi.fn()
}

export const mockWagmiCore = {
  simulateContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  writeContract: vi.fn(),
  readContract: vi.fn()
}
