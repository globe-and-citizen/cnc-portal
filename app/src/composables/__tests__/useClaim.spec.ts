import { describe, expect, it, vi } from 'vitest'
import { useSignWageClaim, useWithdrawClaim } from '../useClaim'
import { ref } from 'vue'
import { useToastStore } from '@/stores/__mocks__/useToastStore'
import { flushPromises } from '@vue/test-utils'

const mockSignature = ref<string | undefined>(undefined)
const mockSuccess = ref(false)
const mockSignTypedDataAsync = vi.fn()
const mockError = ref<unknown>(undefined)
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useSignTypedData: vi.fn(() => ({
      signTypedDataAsync: mockSignTypedDataAsync,
      data: mockSignature,
      isLoading: ref(false)
    })),
    useChainId: vi.fn(() => ({
      value: 1
    })),
    useWriteContract: vi.fn(() => ({
      writeContractAsync: vi.fn(),
      writeContract: vi.fn(),
      error: mockError,
      isPending: ref(false),
      data: ref(null)
    })),
    useWaitForTransactionReceipt: vi.fn(() => ({
      isSuccess: mockSuccess,
      error: mockError
    }))
  }
})

vi.mock('@/stores/useToastStore')
vi.mock('@/stores/user')
vi.mock('@/stores/teamStore', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useTeamStore: vi.fn(() => ({
      currentTeam: {
        cashRemunerationEip712Address: '0xaddress'
      }
    }))
  }
})
const mockClaimError = ref<unknown>(undefined)
vi.mock('@/composables/useCustomFetch', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useCustomFetch: vi.fn(() => ({
      put: () => ({
        json: () => ({
          execute: vi.fn(),
          data: {
            success: true
          },
          loading: ref(false),
          error: ref(null),
          statusCode: ref(200)
        })
      }),
      get: () => ({
        json: () => ({
          execute: vi.fn(),
          data: ref({
            hoursWorked: 10,
            hourlyRate: '100',
            createdAt: '2021-09-01T00:00:00.000Z'
          }),
          loading: ref(false),
          error: mockClaimError,
          statusCode: ref(200)
        })
      })
    }))
  }
})

vi.mock('viem/actions', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    getBalance: vi.fn().mockResolvedValue(1000000000n)
  }
})

describe('useClaim', () => {
  describe('useSignWageClaim', () => {
    it('should set initial values correctly', () => {
      const { execute: signWageClaim, signature, isLoading } = useSignWageClaim()

      expect(signWageClaim).toBeInstanceOf(Function)
      expect(signature.value).toBe(undefined)
      expect(isLoading.value).toBe(false)
    })

    it('should return signature correctly', async () => {
      const { execute: signWageClaim, signature, isLoading } = useSignWageClaim()
      mockSignature.value = '0xsignature'
      await signWageClaim({
        hourlyRate: '100',
        hoursWorked: 10,
        address: '0xaddress',
        createdAt: '2021-09-01T00:00:00.000Z',
        cashRemunerationSignature: '0xsignature',
        id: 1,
        name: 'name',
        status: 'pending'
      })

      expect(signature.value).toBe('0xsignature')
      expect(isLoading.value).toBe(false)
    })

    it('should call addErrorToast when signTypedDataAsync throws an error', async () => {
      mockSignTypedDataAsync.mockRejectedValueOnce(new Error('error'))
      const { execute: signWageClaim } = useSignWageClaim()
      const { addErrorToast } = useToastStore()

      await signWageClaim({
        hourlyRate: '100',
        hoursWorked: 10,
        address: '0xaddress',
        createdAt: '2021-09-01T00:00:00.000Z',
        cashRemunerationSignature: '0xsignature',
        id: 1,
        name: 'name',
        status: 'pending'
      })

      expect(mockSignature.value).toBe('0xsignature')
      expect(addErrorToast).toHaveBeenCalledWith('Failed to sign claim')
    })
  })

  describe('useWithdrawClaim', () => {
    it('should set initial values correctly', () => {
      const { execute: withdrawClaim, isLoading, isSuccess } = useWithdrawClaim()

      expect(withdrawClaim).toBeInstanceOf(Function)
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(false)
    })

    it('should successfully withdraw claim', async () => {
      const { execute: withdrawClaim, isLoading, isSuccess } = useWithdrawClaim()

      const promise = withdrawClaim(1)
      mockSuccess.value = true

      await promise
      mockSuccess.value = false
      await flushPromises()
      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
    })

    it('should call addErrorToast when withdraw claim throws an error', async () => {
      mockError.value = new Error('error')
      mockClaimError.value = new Error('error')
      const { execute: withdrawClaim } = useWithdrawClaim()
      const { addErrorToast } = useToastStore()

      await withdrawClaim(1)

      expect(addErrorToast).toHaveBeenCalledWith('Failed to withdraw claim')
      expect(addErrorToast).toHaveBeenCalledWith('Failed to fetch claim')
    })
  })
})
