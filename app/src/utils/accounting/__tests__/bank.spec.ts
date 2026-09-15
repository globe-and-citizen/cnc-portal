import { describe, it, expect } from 'vitest'
import { mapBankEvents } from '@/utils/accounting/mappers/bank'
import { makeCtx, ADDR, draftUsdValue } from './fixtures'

const ctx = makeCtx()

describe('mapBankEvents', () => {
  it('books a direct native deposit as UC-BANK-02 (Service Revenue)', () => {
    const [entry] = mapBankEvents(
      {
        deposits: [
          {
            id: 'd1',
            contractAddress: ADDR.bank,
            depositor: ADDR.founder,
            amount: '1000000000000000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      credit: 'Service Revenue',
      token: 'native',
      internal: false
    })
    expect(draftUsdValue(entry)).toBe(2) // 1 native * $2
  })

  it('books a client token deposit as UC-BANK-02 (Service Revenue)', () => {
    const [entry] = mapBankEvents(
      {
        tokenDeposits: [
          {
            id: 'd2',
            contractAddress: ADDR.bank,
            depositor: ADDR.client,
            token: ADDR.usdcToken,
            amount: '5000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      credit: 'Service Revenue',
      token: 'usdc'
    })
    expect(draftUsdValue(entry)).toBe(5) // 5 USDC * $1
  })

  it('books a transfer to an internal pocket as UC-BANK-03 funding', () => {
    const [entry] = mapBankEvents(
      {
        transfers: [
          { id: 't1', sender: ADDR.bank, to: ADDR.payroll, amount: '2000000', timestamp: 100 }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-BANK-03',
      debit: 'Cash — Payroll',
      credit: 'Cash — Bank',
      internal: true
    })
  })

  it('flags an external transfer out for an off-chain account assignment', () => {
    const [entry] = mapBankEvents(
      {
        transfers: [
          { id: 't2', sender: ADDR.bank, to: ADDR.client, amount: '2000000', timestamp: 100 }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'CASH-OUT',
      credit: 'Cash — Bank',
      enrichment: 'needs-off-chain-data'
    })
  })

  it('checksum-normalizes the counterparty', () => {
    const [entry] = mapBankEvents(
      {
        deposits: [
          {
            id: 'd4',
            contractAddress: ADDR.bank,
            depositor: ADDR.founder,
            amount: '1',
            timestamp: 1
          }
        ]
      },
      ctx
    )
    expect(entry?.counterparty).toBe('0x6666666666666666666666666666666666666666')
  })
})
