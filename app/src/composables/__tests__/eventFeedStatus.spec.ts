import { describe, expect, it } from 'vitest'
import { combineEventFeedStatuses, getEventFeedStatus } from '../eventsViaLogs'

const OLD = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

describe('event-feed completeness', () => {
  it('marks a successful scan without gaps as complete', () => {
    expect(
      getEventFeedStatus({
        data: { events: { items: [] }, gaps: [], timestampGaps: [] },
        error: null,
        isPending: false
      })
    ).toEqual({ state: 'complete', gapCount: 0, timestampGapCount: 0, queryErrorCount: 0 })
  })

  it('marks scan and timestamp gaps as partial while retaining their counts', () => {
    expect(
      getEventFeedStatus({
        data: {
          events: { items: [] },
          gaps: [{ address: OLD, error: new Error('RPC unavailable') }],
          timestampGaps: [{ transactionHash: '0x1', blockNumber: 10n, reason: 'block-unavailable' }]
        },
        error: null,
        isPending: false
      })
    ).toEqual({ state: 'partial', gapCount: 1, timestampGapCount: 1, queryErrorCount: 0 })
  })

  it('marks a failed query without usable data as unavailable', () => {
    expect(
      getEventFeedStatus({
        data: undefined,
        error: new Error('RPC unavailable'),
        isPending: false
      })
    ).toEqual({ state: 'unavailable', gapCount: 0, timestampGapCount: 0, queryErrorCount: 1 })
  })

  it('keeps cached data partial when a refresh fails', () => {
    expect(
      getEventFeedStatus({
        data: { events: { items: [] }, gaps: [], timestampGaps: [] },
        error: new Error('refresh failed'),
        isPending: false
      })
    ).toEqual({ state: 'partial', gapCount: 0, timestampGapCount: 0, queryErrorCount: 1 })
  })

  it('combines multiple feeds without hiding an unavailable source', () => {
    expect(
      combineEventFeedStatuses([
        { state: 'complete', gapCount: 0, timestampGapCount: 0, queryErrorCount: 0 },
        { state: 'unavailable', gapCount: 0, timestampGapCount: 0, queryErrorCount: 1 }
      ])
    ).toEqual({ state: 'partial', gapCount: 0, timestampGapCount: 0, queryErrorCount: 1 })
  })
})
