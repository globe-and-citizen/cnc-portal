import { describe, expect, it, vi } from 'vitest'
import type { Claim, WeeklyClaim } from '@/types'

const { normalizeClaimResponse, normalizeWeeklyClaimResponse } = await vi.importActual<
  typeof import('../weeklyClaim.queries')
>('../weeklyClaim.queries')

describe('weeklyClaim query normalization', () => {
  it('prefers minutesWorked for individual claims and keeps hoursWorked aligned', () => {
    const claim = normalizeClaimResponse({
      id: 1,
      hoursWorked: 8,
      minutesWorked: 480,
      dayWorked: '2024-01-01T00:00:00.000Z',
      memo: 'Legacy claim',
      wageId: 10,
      wage: {} as Claim['wage'],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    })

    expect(claim.hoursWorked).toBe(480)
    expect(claim.minutesWorked).toBe(480)
  })

  it('normalizes weekly totals from minutesWorked and nested claims', () => {
    const weeklyClaim = normalizeWeeklyClaimResponse({
      id: 2,
      status: 'pending',
      weekStart: '2024-01-01T00:00:00.000Z',
      data: {},
      memberAddress: '0x123' as WeeklyClaim['memberAddress'],
      teamId: 99,
      signature: null,
      wageId: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      hoursWorked: 0,
      minutesWorked: 780,
      wage: {} as WeeklyClaim['wage'],
      claims: [
        {
          id: 11,
          hoursWorked: 5,
          minutesWorked: 300,
          dayWorked: '2024-01-02T00:00:00.000Z',
          memo: 'A',
          wageId: 1,
          wage: {} as Claim['wage'],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        },
        {
          id: 12,
          hoursWorked: 8,
          minutesWorked: 480,
          dayWorked: '2024-01-03T00:00:00.000Z',
          memo: 'B',
          wageId: 1,
          wage: {} as Claim['wage'],
          createdAt: '2024-01-03T00:00:00.000Z',
          updatedAt: '2024-01-03T00:00:00.000Z'
        }
      ]
    })

    expect(weeklyClaim.hoursWorked).toBe(780)
    expect(weeklyClaim.minutesWorked).toBe(780)
    expect(weeklyClaim.claims.map((claim) => claim.hoursWorked)).toEqual([300, 480])
  })
})