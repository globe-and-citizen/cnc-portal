import { describe, expect, it } from 'vitest'
import {
  addVestingMonths,
  buildAddVestingArgs,
  buildVestingCreation,
  buildVestingSchedules,
  formatVestingBoundary,
  formatVestingDuration,
  nextVestingMinute,
  resolveVestingBoundary,
  resolveVestingTokenSymbol,
  summarizeVestingSchedules,
  vestingCreationSchema,
  vestingAmountAtCliff,
  vestingMinutesBetween
} from '@/utils/vesting/schedule'
import { parseUnits } from 'viem'
import type { VestingCreation } from '@/types/vesting'

const MEMBER = '0x0000000000000000000000000000000000000001'

describe('vestingScheduleUtil', () => {
  it('normalizes boundaries and defaults to the next minute', () => {
    const input = new Date(2026, 7, 21, 9, 37, 42, 123)
    expect(nextVestingMinute(input)).toEqual(new Date(2026, 7, 21, 9, 38, 0, 0))
  })

  it('adds calendar presets without losing the selected minute', () => {
    const start = new Date(2026, 7, 21, 9, 37)
    expect(addVestingMonths(start, 12)).toEqual(new Date(2027, 7, 21, 9, 37))
    expect(addVestingMonths(start, 48)).toEqual(new Date(2030, 7, 21, 9, 37))
  })

  it('derives minute and human-calendar durations from exact boundaries', () => {
    const start = new Date(2026, 7, 21, 9, 37)
    const end = new Date(2027, 8, 22, 10, 52)
    expect(vestingMinutesBetween(start, end)).toBe((end.getTime() - start.getTime()) / 60_000)
    expect(formatVestingDuration(start, end)).toBe('1 year, 1 month, 1 day, 1 hour, 15 minutes')
    expect(formatVestingBoundary(start)).toContain('09:37')
    expect(resolveVestingBoundary(start, '10:52')).toEqual(new Date(2026, 7, 21, 10, 52))
    expect(resolveVestingBoundary(start, 'invalid')).toBeNull()
  })

  it('validates creation boundaries without Vue state', () => {
    const startAt = new Date(2026, 7, 21, 9, 37)
    const valid = vestingCreationSchema.safeParse({
      memberAddress: MEMBER,
      totalAmount: '0.000001',
      startAt,
      endAt: new Date(2026, 7, 21, 9, 38),
      cliffEndAt: startAt
    })
    const invalid = vestingCreationSchema.safeParse({
      memberAddress: 'invalid',
      totalAmount: '0.0000001',
      startAt,
      endAt: startAt,
      cliffEndAt: new Date(2026, 7, 21, 9, 39)
    })

    expect(valid.success).toBe(true)
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(['memberAddress', 'totalAmount', 'endAt', 'cliffEndAt'])
      )
    }
  })

  it('builds complete creation data and normalizes the token-symbol fallback', () => {
    const startAt = new Date(2026, 7, 21, 9, 37)
    const endAt = new Date(2026, 7, 21, 10, 37)
    const cliffEndAt = new Date(2026, 7, 21, 10, 7)

    expect(
      buildVestingCreation({
        member: { name: 'Ada', address: MEMBER },
        totalAmount: '10',
        tokenSymbol: 'SHR',
        startAt,
        endAt,
        cliffEndAt,
        noCliff: false
      })
    ).toMatchObject({ durationMinutes: 60, cliffMinutes: 30 })
    expect(resolveVestingTokenSymbol('  SHR  ')).toBe('SHR')
    expect(resolveVestingTokenSymbol('')).toBe('SHARES')
    expect(resolveVestingTokenSymbol(undefined)).toBe('SHARES')
  })

  it('matches the contract linear accrual available at the cliff', () => {
    const start = new Date(2026, 0, 1, 9, 0)
    const cliff = new Date(2027, 0, 1, 9, 0)
    const end = new Date(2030, 0, 1, 9, 0)
    expect(vestingAmountAtCliff('1000', start, cliff, end)).toBe(
      (parseUnits('1000', 6) * BigInt(cliff.getTime() - start.getTime())) /
        BigInt(end.getTime() - start.getTime())
    )
  })

  it('preserves the smallest supported token unit in previews and write arguments', () => {
    const start = new Date(2026, 0, 1, 9, 0)
    const end = new Date(2026, 0, 1, 9, 2)
    const data: VestingCreation = {
      member: { name: 'Ada', address: MEMBER },
      totalAmount: '0.000001',
      tokenSymbol: 'SHR',
      startAt: start,
      endAt: end,
      cliffEndAt: end,
      durationMinutes: 2,
      cliffMinutes: 2,
      noCliff: false
    }

    expect(vestingAmountAtCliff(data.totalAmount, start, end, end)).toBe(1n)
    expect(buildAddVestingArgs(data)).toEqual([
      MEMBER,
      BigInt(Math.floor(start.getTime() / 1000)),
      120n,
      120n,
      1n
    ])
  })

  it('derives V2 claimable amounts and schedule state from contract tuples', () => {
    const now = 1_700_050_000
    const [schedule] = buildVestingSchedules(
      [
        [
          [MEMBER],
          [3n],
          [
            {
              start: 1_700_000_000n,
              duration: 100_000n,
              cliff: 10_000n,
              totalAmount: 10_000_000n,
              released: 2_000_000n,
              active: true
            }
          ]
        ]
      ],
      now
    )

    expect(schedule).toMatchObject({
      index: 3n,
      vestedAmount: 5_000_000n,
      claimableAmount: 3_000_000n,
      unvestedAmount: 5_000_000n,
      progress: 50,
      state: 'claimable'
    })
    expect(summarizeVestingSchedules([schedule])).toEqual({
      promised: 10_000_000n,
      vested: 5_000_000n,
      claimable: 3_000_000n,
      released: 2_000_000n
    })
  })

  it('keeps a cancelled V2 schedule at its final released settlement', () => {
    const [schedule] = buildVestingSchedules([
      [
        [MEMBER],
        [0n],
        [
          {
            start: 1_700_000_000n,
            duration: 100_000n,
            cliff: 0n,
            totalAmount: 10_000_000n,
            released: 4_000_000n,
            active: false
          }
        ]
      ]
    ])

    expect(schedule).toMatchObject({
      vestedAmount: 4_000_000n,
      claimableAmount: 0n,
      unvestedAmount: 6_000_000n,
      state: 'cancelled'
    })
  })

  it('distinguishes an active schedule with nothing currently claimable', () => {
    const [schedule] = buildVestingSchedules(
      [
        [
          [MEMBER],
          [0n],
          [
            {
              start: 1_700_000_000n,
              duration: 100_000n,
              cliff: 0n,
              totalAmount: 10_000_000n,
              released: 5_000_000n,
              active: true
            }
          ]
        ]
      ],
      1_700_050_000
    )

    expect(schedule.state).toBe('accruing')
    expect(schedule.claimableAmount).toBe(0n)
  })

  it.each([
    ['upcoming', 1_699_999_999, 10_000n, 0n],
    ['cliff_locked', 1_700_005_000, 10_000n, 0n],
    ['fully_vested', 1_700_100_000, 0n, 0n],
    ['completed', 1_700_100_000, 0n, 10_000_000n]
  ])('derives the %s state at the chain timestamp', (state, now, cliff, released) => {
    const [schedule] = buildVestingSchedules(
      [
        [
          [MEMBER],
          [0n],
          [
            {
              start: 1_700_000_000n,
              duration: 100_000n,
              cliff,
              totalAmount: 10_000_000n,
              released,
              active: true
            }
          ]
        ]
      ],
      now
    )

    expect(schedule.state).toBe(state)
  })

  it('rejects malformed parallel arrays instead of fabricating schedule indices', () => {
    expect(
      buildVestingSchedules([
        [
          [MEMBER],
          [],
          [
            {
              start: 1n,
              duration: 2n,
              cliff: 0n,
              totalAmount: 1n,
              released: 0n,
              active: true
            }
          ]
        ]
      ])
    ).toEqual([])
  })
})
