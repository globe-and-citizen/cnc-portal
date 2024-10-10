import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGetBoardOfDirectors } from '@/composables/bod'

// Mock the BoDService class
vi.mock('@/services/bodService', () => {
  return {
    BoDService: vi.fn().mockImplementation(() => ({
      createBODContract: vi.fn().mockResolvedValue('0xBODContractAddress'),
      getBoardOfDirectors: vi.fn().mockResolvedValue(['0xDirector1', '0xDirector2'])
    }))
  }
})

describe('BoD Composables', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useGetBoardOfDirectors', () => {
    it('should get board of directors successfully', async () => {
      const { execute, isLoading, isSuccess, error, boardOfDirectors } = useGetBoardOfDirectors()

      await execute('0xBODAddress')

      expect(isLoading.value).toBe(false)
      expect(isSuccess.value).toBe(true)
      expect(error.value).toBe(null)
      expect(boardOfDirectors.value).toEqual(['0xDirector1', '0xDirector2'])
    })
  })
})
