import { describe, it, expect } from 'vitest'
import { mapFees } from '@/utils/accounting/mappers/fees'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

describe('mapFees', () => {
  it('books the protocol fee as a Transaction Fee Expense leaving the Bank', () => {
    const [entry] = mapFees(
      {
        bankFeePaids: [
          {
            id: 'f1',
            contractAddress: ADDR.bank,
            feeCollector: ADDR.feeCollector,
            token: ADDR.usdcToken,
            amount: '1000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'FEE',
      debit: 'Transaction Fee Expense',
      credit: 'Cash — Bank',
      amountUsd: 1,
      internal: false
    })
  })

  it('dedups the Bank/FeeCollector dual-write of the same fee', () => {
    const entries = mapFees(
      {
        bankFeePaids: [
          {
            id: 'f1',
            contractAddress: ADDR.bank,
            feeCollector: ADDR.feeCollector,
            token: ADDR.usdcToken,
            amount: '1000000',
            timestamp: 100
          }
        ],
        feeCollectorFeePaids: [
          {
            id: 'f2',
            contractAddress: ADDR.feeCollector,
            payer: ADDR.bank,
            token: ADDR.usdcToken,
            amount: '1000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe('f1') // the Bank row is canonical
  })

  it('keeps distinct fees (different amount or timestamp) separate', () => {
    const entries = mapFees(
      {
        bankFeePaids: [
          {
            id: 'f1',
            contractAddress: ADDR.bank,
            feeCollector: ADDR.feeCollector,
            token: ADDR.usdcToken,
            amount: '1000000',
            timestamp: 100
          },
          {
            id: 'f2',
            contractAddress: ADDR.bank,
            feeCollector: ADDR.feeCollector,
            token: ADDR.usdcToken,
            amount: '2000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entries).toHaveLength(2)
  })

  it('handles a native fee (null token)', () => {
    const [entry] = mapFees(
      {
        bankFeePaids: [
          {
            id: 'f1',
            contractAddress: ADDR.bank,
            feeCollector: ADDR.feeCollector,
            token: null,
            amount: '1000000000000000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({ token: 'native', amountUsd: 2 })
  })
})
