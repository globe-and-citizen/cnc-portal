import { describe, expect, it } from 'vitest'
import {
  addVestingMonths,
  buildVestingSchedules,
  formatVestingBoundary,
  formatVestingDuration,
  nextVestingMinute,
  normalizeVestingMinute,
  summarizeVestingSchedules,
  vestingAmountAtCliff,
  vestingMinutesBetween
} from '@/utils/vestingScheduleUtil'

describe('vestingScheduleUtil', () => {
  it('normalizes boundaries and defaults to the next minute', () => {
    const input = new Date(2026, 7, 21, 9, 37, 42, 123)
    expect(normalizeVestingMinute(input)).toEqual(new Date(2026, 7, 21, 9, 37, 0, 0))
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
  })

  it('matches the contract linear accrual available at the cliff', () => {
    const start = new Date(2026, 0, 1, 9, 0)
    const cliff = new Date(2027, 0, 1, 9, 0)
    const end = new Date(2030, 0, 1, 9, 0)
    expect(vestingAmountAtCliff('1000', start, cliff, end)).toBeCloseTo(
      (1000 * (cliff.getTime() - start.getTime())) / (end.getTime() - start.getTime())
    )
  })

  it('derives V2 claimable amounts and schedule state from contract tuples', () => {
    const now = 1_700_050_000
    const [schedule] = buildVestingSchedules(
      [
        [
          ['0x0000000000000000000000000000000000000001'],
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
        ['0x0000000000000000000000000000000000000001'],
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
          ['0x0000000000000000000000000000000000000001'],
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
})
