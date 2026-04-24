import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Address } from 'viem'
import type { Claim, WeeklyClaim } from '@/types'
import { mockUploadFileApi } from '@/tests/mocks/api.mock'
import {
  smartUseMutation,
  useMutationFn,
  useQueryClientFn,
  useQueryFn
} from '@/tests/mocks/composables.mock'
import apiClient from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

const weeklyClaimQueries =
  await vi.importActual<typeof import('../weeklyClaim.queries')>('../weeklyClaim.queries')

const createClaimResponse = (
  overrides: Partial<Claim> & { minutesWorked?: number | null } = {}
) => ({
  id: 1,
  hoursWorked: 480,
  minutesWorked: 480,
  dayWorked: '2024-01-01T00:00:00.000Z',
  memo: 'Claim memo',
  wageId: 10,
  wage: {} as Claim['wage'],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides
})

const createWeeklyClaimResponse = (
  overrides: Partial<WeeklyClaim> & {
    minutesWorked?: number | null
    claims?: Array<ReturnType<typeof createClaimResponse>>
  } = {}
) => ({
  id: 2,
  status: 'pending' as const,
  weekStart: '2024-01-01T00:00:00.000Z',
  data: {},
  memberAddress: '0x1234567890123456789012345678901234567890' as Address,
  teamId: 99,
  signature: null,
  wageId: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  hoursWorked: 0,
  minutesWorked: 780,
  wage: {} as WeeklyClaim['wage'],
  claims: [createClaimResponse()],
  ...overrides
})

describe('weeklyClaim.queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMutationFn.mockImplementation(smartUseMutation)
    useQueryClientFn.mockReturnValue({
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn()
    })
  })

  describe('normalization helpers', () => {
    it('defaults claim worked minutes to zero when minutesWorked is absent', () => {
      const legacyClaim = weeklyClaimQueries.normalizeClaimResponse(
        createClaimResponse({ hoursWorked: 75, minutesWorked: null })
      )
      const emptyClaim = weeklyClaimQueries.normalizeClaimResponse(
        createClaimResponse({ hoursWorked: null, minutesWorked: null })
      )

      expect(legacyClaim.hoursWorked).toBe(75)
      expect(legacyClaim.minutesWorked).toBe(0)
      expect(emptyClaim.hoursWorked).toBeNull()
      expect(emptyClaim.minutesWorked).toBe(0)
    })
  })

  describe('query hooks', () => {
    it('configures the team weekly claims query and transforms the response', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: [
          createWeeklyClaimResponse({
            minutesWorked: null,
            claims: [createClaimResponse({ hoursWorked: 120, minutesWorked: null })]
          })
        ]
      })

      weeklyClaimQueries.useGetTeamWeeklyClaimsQuery({
        queryParams: {
          teamId: 'team-1',
          userAddress: '0x1234567890123456789012345678901234567890' as Address,
          status: 'pending'
        }
      })

      const options = useQueryFn.mock.calls.at(-1)?.[0] as {
        queryKey: { value: unknown }
        enabled?: () => boolean
        queryFn: () => Promise<WeeklyClaim[]>
      }
      const data = await options.queryFn()

      expect(options.queryKey.value).toEqual(
        weeklyClaimQueries.weeklyClaimKeys.team(
          'team-1',
          '0x1234567890123456789012345678901234567890' as Address,
          'pending'
        )
      )
      expect(options.enabled?.()).toBe(true)
      expect(apiClient.get).toHaveBeenCalledWith('weeklyClaim/', {
        params: {
          teamId: 'team-1',
          userAddress: '0x1234567890123456789012345678901234567890',
          status: 'pending'
        }
      })
      expect(data[0]?.hoursWorked).toBe(0)
      expect(data[0]?.minutesWorked).toBe(0)
    })

    it('configures the weekly claim detail query and supports disabled state', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        data: createWeeklyClaimResponse({
          id: 77,
          minutesWorked: 600,
          claims: [createClaimResponse({ hoursWorked: 120, minutesWorked: 120 })]
        })
      })

      weeklyClaimQueries.useGetWeeklyClaimByIdQuery({
        pathParams: { claimId: '77' }
      })

      let options = useQueryFn.mock.calls.at(-1)?.[0] as {
        queryKey: { value: unknown }
        enabled?: () => boolean
        queryFn: () => Promise<WeeklyClaim>
      }

      expect(options.queryKey.value).toEqual(weeklyClaimQueries.weeklyClaimKeys.detail('77'))
      expect(options.enabled?.()).toBe(true)
      await expect(options.queryFn()).resolves.toMatchObject({ minutesWorked: 600 })
      expect(apiClient.get).toHaveBeenCalledWith('weeklyClaim/77', undefined)

      weeklyClaimQueries.useGetWeeklyClaimByIdQuery({
        pathParams: { claimId: null }
      })

      options = useQueryFn.mock.calls.at(-1)?.[0] as { enabled?: () => boolean }
      expect(options.enabled?.()).toBe(false)
    })
  })

  describe('custom mutations with file handling', () => {
    it('submits a claim with uploaded files and invalidates team queries', async () => {
      const invalidateQueries = vi.fn().mockResolvedValue(undefined)
      useQueryClientFn.mockReturnValue({
        invalidateQueries,
        getQueryData: vi.fn(),
        setQueryData: vi.fn(),
        removeQueries: vi.fn()
      })
      mockUploadFileApi.mockResolvedValue({
        files: [
          {
            fileKey: 'proof-1',
            fileUrl: 'https://example.com/proof-1',
            metadata: {
              fileType: 'image/png',
              fileSize: 512
            }
          }
        ]
      })
      vi.mocked(apiClient.post).mockResolvedValue({ data: undefined })

      const mutation = weeklyClaimQueries.useSubmitClaimMutation()
      await mutation.mutateAsync({
        teamId: 12,
        minutesWorked: 95,
        memo: 'Worked on feature',
        dayWorked: '2024-01-03',
        files: [new File(['proof'], 'proof.png', { type: 'image/png' })]
      })

      expect(mockUploadFileApi).toHaveBeenCalledTimes(1)
      expect(apiClient.post).toHaveBeenCalledWith('/claim', {
        teamId: '12',
        minutesWorked: '95',
        memo: 'Worked on feature',
        dayWorked: '2024-01-03',
        attachments: [
          {
            fileKey: 'proof-1',
            fileUrl: 'https://example.com/proof-1',
            fileType: 'image/png',
            fileSize: 512
          }
        ]
      })
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: weeklyClaimQueries.weeklyClaimKeys.teams()
      })
    })

    it('submits a claim without files and omits attachments', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: undefined })

      const mutation = weeklyClaimQueries.useSubmitClaimMutation()
      await mutation.mutateAsync({
        teamId: '21',
        minutesWorked: 45,
        memo: 'No proof needed',
        dayWorked: '2024-01-04'
      })

      expect(mockUploadFileApi).not.toHaveBeenCalled()
      expect(apiClient.post).toHaveBeenCalledWith('/claim', {
        teamId: '21',
        minutesWorked: '45',
        memo: 'No proof needed',
        dayWorked: '2024-01-04',
        attachments: undefined
      })
    })

    it('edits a claim with uploaded files, optional deletions and invalidation', async () => {
      const invalidateQueries = vi.fn().mockResolvedValue(undefined)
      useQueryClientFn.mockReturnValue({
        invalidateQueries,
        getQueryData: vi.fn(),
        setQueryData: vi.fn(),
        removeQueries: vi.fn()
      })
      mockUploadFileApi.mockResolvedValue({
        files: [
          {
            fileKey: 'updated-proof',
            fileUrl: 'https://example.com/updated-proof',
            metadata: {
              fileType: 'application/pdf',
              fileSize: 2048
            }
          }
        ]
      })
      vi.mocked(apiClient.put).mockResolvedValue({ data: undefined })

      const mutation = weeklyClaimQueries.useEditClaimWithFilesMutation()
      await mutation.mutateAsync({
        claimId: 31,
        minutesWorked: 120,
        memo: 'Updated memo',
        dayWorked: '2024-01-06',
        deletedFileIndexes: [1],
        files: [new File(['proof'], 'updated-proof.pdf', { type: 'application/pdf' })]
      })

      expect(mockUploadFileApi).toHaveBeenCalledTimes(1)
      expect(apiClient.put).toHaveBeenCalledWith('/claim/31', {
        minutesWorked: '120',
        memo: 'Updated memo',
        dayWorked: '2024-01-06',
        deletedFileIndexes: [1],
        attachments: [
          {
            fileKey: 'updated-proof',
            fileUrl: 'https://example.com/updated-proof',
            fileType: 'application/pdf',
            fileSize: 2048
          }
        ]
      })
      expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
        queryKey: weeklyClaimQueries.weeklyClaimKeys.teams()
      })
      expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
        queryKey: weeklyClaimQueries.weeklyClaimKeys.detail(31)
      })
    })

    it('surfaces backend errors when editing a claim with files', async () => {
      vi.mocked(apiClient.put).mockRejectedValue({
        response: { data: { message: 'Claim is locked' } }
      })

      const mutation = weeklyClaimQueries.useEditClaimWithFilesMutation()

      await expect(
        mutation.mutateAsync({
          claimId: 55,
          minutesWorked: 60,
          memo: 'Should fail',
          dayWorked: '2024-01-08'
        })
      ).rejects.toThrow('Claim is locked')
    })

    it('falls back to a generic message when the backend omits an error message', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('network timeout'))

      const mutation = weeklyClaimQueries.useEditClaimWithFilesMutation()

      await expect(
        mutation.mutateAsync({
          claimId: 56,
          minutesWorked: 60,
          memo: 'Should also fail',
          dayWorked: '2024-01-09'
        })
      ).rejects.toThrow('Failed to update claim')
    })
  })
})
