import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAllPolymarketActivity, fetchAllPolymarketPositions, fetchPolymarketLatestPnl } from '~/api/polymarket'

const user = '0x098C06CaF333dfA686a6F623C9De80169Eb39DFB'
const apiUrl = 'https://data-api.polymarket.com/v2'
const fetchMock = vi.fn()

function page<Row>(data: Row[], nextCursor: string | null = null) {
  return { data, pagination: { limit: 1000, offset: 0, has_more: nextCursor !== null, next_cursor: nextCursor } }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('$fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchAllPolymarketActivity', () => {
  it('maps v2 snake_case rows onto the dashboard activity shape', async () => {
    fetchMock.mockResolvedValueOnce(page([{
      proxy_wallet: user,
      timestamp: 1_700_000_000,
      condition_id: '0xabc',
      type: 'TRADE',
      size: 10,
      usdc_size: 4.5,
      transaction_hash: '0xhash',
      price: 0.45,
      token_id: '123',
      side: 'BUY',
      outcome_index: 0,
      event_slug: 'event'
    }]))

    const activity = await fetchAllPolymarketActivity(user)

    expect(activity).toEqual([expect.objectContaining({
      proxyWallet: user,
      conditionId: '0xabc',
      usdcSize: 4.5,
      transactionHash: '0xhash',
      asset: '123',
      outcomeIndex: 0,
      eventSlug: 'event'
    })])
  })

  it('follows next_cursor until it is null, re-sending the filters', async () => {
    fetchMock
      .mockResolvedValueOnce(page([{ timestamp: 1 }], 'cursor-2'))
      .mockResolvedValueOnce(page([{ timestamp: 2 }]))

    const activity = await fetchAllPolymarketActivity(user)

    expect(activity.map(row => row.timestamp)).toEqual([1, 2])
    expect(fetchMock).toHaveBeenNthCalledWith(1, `${apiUrl}/activity`, {
      query: { user, sortBy: 'TIMESTAMP', sortDirection: 'ASC', limit: 1000 }
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${apiUrl}/activity`, {
      query: { user, sortBy: 'TIMESTAMP', sortDirection: 'ASC', limit: 1000, cursor: 'cursor-2' }
    })
  })

  it('turns null numbers into absent fields', async () => {
    fetchMock.mockResolvedValueOnce(page([{ timestamp: 1, usdc_size: null, price: null }]))

    const [row] = await fetchAllPolymarketActivity(user)

    expect(row?.usdcSize).toBeUndefined()
    expect(row?.price).toBeUndefined()
  })

  it('rejects an invalid address without calling the API', async () => {
    await expect(fetchAllPolymarketActivity('not-an-address')).rejects.toThrow('Invalid Polymarket user address')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('fetchAllPolymarketPositions', () => {
  it('merges open and closed positions, since v2 returns closed ones only on request', async () => {
    fetchMock.mockImplementation(async (_url: string, { query }: { query: Record<string, unknown> }) =>
      query.status === 'CLOSED'
        ? page([{ token_id: 'closed', current_size: 0, realized_pnl: 12 }])
        : page([{ token_id: 'open', current_size: 5, unrealized_pnl: -2 }])
    )

    const positions = await fetchAllPolymarketPositions(user)

    expect(positions).toEqual([
      expect.objectContaining({ asset: 'open', size: 5, cashPnl: -2 }),
      expect.objectContaining({ asset: 'closed', size: 0, realizedPnl: 12 })
    ])
  })

  it('maps the v2 cost and price fields onto the dashboard position shape', async () => {
    fetchMock.mockImplementation(async (_url: string, { query }: { query: Record<string, unknown> }) =>
      query.status === 'CLOSED'
        ? page([])
        : page([{
            avg_price: 0.5,
            current_price: 0.8,
            total_size: 20,
            entry_cost_usdc: 5,
            current_value: 8,
            percent_pnl: 60,
            end_date: '2026-12-31',
            negative_risk: true
          }])
    )

    const [position] = await fetchAllPolymarketPositions(user)

    expect(position).toEqual(expect.objectContaining({
      avgPrice: 0.5,
      curPrice: 0.8,
      totalBought: 20,
      initialValue: 5,
      currentValue: 8,
      percentPnl: 60,
      endDate: '2026-12-31',
      negativeRisk: true
    }))
  })
})

describe('fetchPolymarketLatestPnl', () => {
  it('returns the position P&L of the most recent point', async () => {
    fetchMock.mockResolvedValueOnce({
      data: {
        points: [
          { timestamp: 300, position_pnl: 42 },
          { timestamp: 100, position_pnl: 7 },
          { timestamp: 400, position_pnl: null }
        ]
      }
    })

    const pnl = await fetchPolymarketLatestPnl(user)

    expect(pnl).toBe(42)
    expect(fetchMock).toHaveBeenCalledWith(`${apiUrl}/user-pnl`, { query: { user, interval: 'all', fidelity: '1d' } })
  })

  it('returns 0 for a wallet without P&L history', async () => {
    fetchMock.mockResolvedValueOnce({ data: { points: [] } })

    expect(await fetchPolymarketLatestPnl(user)).toBe(0)
  })
})
