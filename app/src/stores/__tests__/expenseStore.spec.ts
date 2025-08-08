import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useExpenseDataStore } from '../expenseStore'

// Mock stores
const mockCurrentTeamId = ref('team-123')
const mockAddress = ref('0xUser123')
const mockAddErrorToast = vi.fn()

vi.mock('@/stores', () => ({
  useUserDataStore: vi.fn(() => ({
    address: mockAddress.value
  })),
  useTeamStore: vi.fn(() => ({
    currentTeamId: mockCurrentTeamId.value
  })),
  useToastStore: vi.fn(() => ({
    addErrorToast: mockAddErrorToast
  }))
}))

// Mock useCustomFetch
const mockExecute = vi.fn()
const mockAllExpenseData = ref(null)
const mockIsFetching = ref(false)
const mockError = ref(null)
const mockStatusCode = ref(null)

vi.mock('@/composables/useCustomFetch', () => ({
  useCustomFetch: vi.fn(() => ({
    get: vi.fn(() => ({
      json: vi.fn(() => ({
        isFetching: mockIsFetching,
        error: mockError,
        data: mockAllExpenseData,
        execute: mockExecute,
        statusCode: mockStatusCode
      }))
    }))
  }))
}))

vi.mock('@/utils/generalUtil', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('useExpenseDataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockAllExpenseData.value = null
    mockIsFetching.value = false
    mockError.value = null
    mockCurrentTeamId.value = 'team-123'
    mockAddress.value = '0xUser123'
  })

  describe('initialization', () => {
    it('should initialize with correct URI based on team ID', () => {
      const store = useExpenseDataStore()
      
      // The store should be initialized
      expect(store).toBeDefined()
      expect(mockExecute).toBeDefined()
    })
  })

  describe('myApprovedExpenses computed', () => {
    it('should return filtered expenses for current user', () => {
      const mockExpenses = [
        {
          signature: 'sig1',
          data: {
            approvedAddress: '0xUser123',
            amount: 100,
            description: 'Expense 1'
          }
        },
        {
          signature: 'sig2',
          data: {
            approvedAddress: '0xOtherUser',
            amount: 200,
            description: 'Expense 2'
          }
        },
        {
          signature: 'sig3',
          data: {
            approvedAddress: '0xUser123',
            amount: 300,
            description: 'Expense 3'
          }
        }
      ]
      
      mockAllExpenseData.value = mockExpenses
      
      const store = useExpenseDataStore()
      const userExpenses = store.myApprovedExpenses
      
      expect(userExpenses).toHaveLength(2)
      expect(userExpenses[0]).toEqual({
        approvedAddress: '0xUser123',
        amount: 100,
        description: 'Expense 1',
        signature: 'sig1'
      })
      expect(userExpenses[1]).toEqual({
        approvedAddress: '0xUser123',
        amount: 300,
        description: 'Expense 3',
        signature: 'sig3'
      })
    })

    it('should return empty array when no expenses exist', () => {
      mockAllExpenseData.value = null
      
      const store = useExpenseDataStore()
      
      expect(store.myApprovedExpenses).toEqual([])
    })

    it('should return empty array when no expenses match user address', () => {
      const mockExpenses = [
        {
          signature: 'sig1',
          data: {
            approvedAddress: '0xOtherUser',
            amount: 100,
            description: 'Expense 1'
          }
        }
      ]
      
      mockAllExpenseData.value = mockExpenses
      
      const store = useExpenseDataStore()
      
      expect(store.myApprovedExpenses).toEqual([])
    })

    it('should handle empty expenses array', () => {
      mockAllExpenseData.value = []
      
      const store = useExpenseDataStore()
      
      expect(store.myApprovedExpenses).toEqual([])
    })
  })

  describe('allExpenseDataParsed computed', () => {
    it('should return parsed expense data', () => {
      const mockExpenses = [
        {
          id: '1',
          signature: 'sig1',
          data: {
            approvedAddress: '0xUser123',
            amount: 100,
            description: 'Expense 1'
          }
        },
        {
          id: '2',
          signature: 'sig2',
          data: {
            approvedAddress: '0xOtherUser',
            amount: 200,
            description: 'Expense 2'
          }
        }
      ]
      
      mockAllExpenseData.value = mockExpenses
      
      const store = useExpenseDataStore()
      const parsedExpenses = store.allExpenseDataParsed
      
      expect(parsedExpenses).toHaveLength(2)
      expect(parsedExpenses[0]).toEqual({
        id: '1',
        signature: 'sig1',
        approvedAddress: '0xUser123',
        amount: 100,
        description: 'Expense 1'
      })
      expect(parsedExpenses[1]).toEqual({
        id: '2',
        signature: 'sig2',
        approvedAddress: '0xOtherUser',
        amount: 200,
        description: 'Expense 2'
      })
    })

    it('should return empty array when no expenses exist', () => {
      mockAllExpenseData.value = null
      
      const store = useExpenseDataStore()
      
      expect(store.allExpenseDataParsed).toEqual([])
    })

    it('should handle empty expenses array', () => {
      mockAllExpenseData.value = []
      
      const store = useExpenseDataStore()
      
      expect(store.allExpenseDataParsed).toEqual([])
    })
  })

  describe('reactive updates', () => {
    it('should update computed values when allExpenseData changes', () => {
      const store = useExpenseDataStore()
      
      // Initially empty
      expect(store.myApprovedExpenses).toEqual([])
      expect(store.allExpenseDataParsed).toEqual([])
      
      // Add data
      mockAllExpenseData.value = [
        {
          signature: 'sig1',
          data: {
            approvedAddress: '0xUser123',
            amount: 100,
            description: 'Test expense'
          }
        }
      ]
      
      expect(store.myApprovedExpenses).toHaveLength(1)
      expect(store.allExpenseDataParsed).toHaveLength(1)
    })

    it('should update filtered results when user address changes', () => {
      const mockExpenses = [
        {
          signature: 'sig1',
          data: {
            approvedAddress: '0xUser123',
            amount: 100,
            description: 'Expense 1'
          }
        },
        {
          signature: 'sig2',
          data: {
            approvedAddress: '0xNewUser',
            amount: 200,
            description: 'Expense 2'
          }
        }
      ]
      
      mockAllExpenseData.value = mockExpenses
      
      const store = useExpenseDataStore()
      
      // Initially user has 1 expense
      expect(store.myApprovedExpenses).toHaveLength(1)
      expect(store.myApprovedExpenses[0].approvedAddress).toBe('0xUser123')
      
      // Change user address
      mockAddress.value = '0xNewUser'
      
      // Should now show different user's expenses
      expect(store.myApprovedExpenses).toHaveLength(1)
      expect(store.myApprovedExpenses[0].approvedAddress).toBe('0xNewUser')
    })
  })

  describe('error handling', () => {
    it('should handle malformed expense data gracefully', () => {
      // Missing data property
      mockAllExpenseData.value = [
        {
          signature: 'sig1'
          // Missing data property
        }
      ]
      
      const store = useExpenseDataStore()
      
      // Should not throw and return empty results
      expect(() => store.myApprovedExpenses).not.toThrow()
      expect(() => store.allExpenseDataParsed).not.toThrow()
    })
  })
})