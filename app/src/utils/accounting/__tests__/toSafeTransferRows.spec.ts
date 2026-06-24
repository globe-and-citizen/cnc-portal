import { describe, it, expect } from 'vitest'
import type { SafeIncomingTransfer } from '@/types/safe'
import { toSafeTransferRows } from '@/utils/accounting/assemble'
import { ADDR } from './fixtures'

const ROUTER = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

describe('toSafeTransferRows', () => {
  const transfers: SafeIncomingTransfer[] = [
    {
      type: 'ETHER_TRANSFER',
      executionDate: '2026-03-01T00:00:00Z',
      blockNumber: 1,
      transactionHash: '0xhash1',
      to: ADDR.safe,
      from: ADDR.founder,
      value: '1000000000000000000'
    },
    {
      type: 'ERC20_TRANSFER',
      executionDate: '2026-03-02T00:00:00Z',
      blockNumber: 2,
      transactionHash: '0xhash2',
      to: ADDR.safe,
      from: ADDR.client,
      value: '5000000',
      tokenAddress: ADDR.usdcToken
    },
    {
      type: 'ERC721_TRANSFER',
      executionDate: '2026-03-03T00:00:00Z',
      blockNumber: 3,
      transactionHash: '0xhash3',
      to: ADDR.safe,
      from: ADDR.client,
      value: '1'
    },
    {
      type: 'ERC20_TRANSFER',
      executionDate: '2026-03-04T00:00:00Z',
      blockNumber: 4,
      transactionHash: '0xhash4',
      to: ADDR.safe,
      from: ROUTER, // routed investment — booked from the router event, must be excluded
      value: '9000000',
      tokenAddress: ADDR.usdcToken
    }
  ]

  it('drops NFT and router-originated transfers and converts dates to unix seconds', () => {
    const rows = toSafeTransferRows(transfers, ROUTER)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ token: null, amount: '1000000000000000000', txHash: '0xhash1' })
    expect(rows[1]).toMatchObject({ token: ADDR.usdcToken, amount: '5000000' })
    expect(rows[0].timestamp).toBe(Math.floor(Date.parse('2026-03-01T00:00:00Z') / 1000))
  })

  it('tolerates a null transfer list', () => {
    expect(toSafeTransferRows(null, ROUTER)).toEqual([])
  })

  it('excludes an inflow that matches a router deposit by (depositor, amount)', () => {
    // The router forwards an investment to the Safe with `from = the depositor`,
    // so it is not caught by the router-address check — it must be matched and
    // dropped by (depositor, amount), since UC-SDR-01 books it as Investor Equity.
    const investorDeposit: SafeIncomingTransfer = {
      type: 'ERC20_TRANSFER',
      executionDate: '2026-03-05T00:00:00Z',
      blockNumber: 5,
      transactionHash: '0xhash5',
      to: ADDR.safe,
      from: ADDR.client,
      value: '7000000',
      tokenAddress: ADDR.usdcToken
    }
    const deposits = [
      {
        id: 'd1',
        contractAddress: ROUTER,
        depositor: ADDR.client,
        token: ADDR.usdcToken,
        tokenAmount: '7000000',
        sherAmount: '14000000',
        timestamp: 5
      }
    ]

    const withoutDeposits = toSafeTransferRows([investorDeposit], ROUTER)
    expect(withoutDeposits).toHaveLength(1) // no router data → kept (would be misread as a client payment)

    const withDeposits = toSafeTransferRows([investorDeposit], ROUTER, deposits)
    expect(withDeposits).toHaveLength(0) // matched the router deposit → excluded
  })
})
