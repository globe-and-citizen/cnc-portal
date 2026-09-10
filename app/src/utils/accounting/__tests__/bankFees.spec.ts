import { describe, it, expect } from 'vitest'
import { mapBankEvents } from '@/utils/accounting/mappers/bank'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

describe('Bank fee mapping', () => {
  it('books the protocol fee as a Transaction Fee Expense leaving the Bank', () => {
    const [entry] = mapBankEvents(
      {
        fees: [
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

  it('keeps distinct fees (different amount or timestamp) separate', () => {
    const entries = mapBankEvents(
      {
        fees: [
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

  it('scopes the credit leg to the emitting Bank, so a redeploy keeps its own fees', () => {
    const [entry] = mapBankEvents(
      {
        fees: [
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
    expect(entry.creditInstance?.toLowerCase()).toBe(ADDR.bank)
  })

  it('handles a native fee (null token)', () => {
    const [entry] = mapBankEvents(
      {
        fees: [
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

  it('preserves fee source evidence for JournalEntry reconciliation', () => {
    const operationId = `0x${'a'.repeat(64)}`
    const entries = mapBankEvents(
      {
        fees: [
          {
            id: `${operationId}-2`,
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

    expect(entries).toHaveLength(1)
    expect(entries[0]?.sourceOperationId).toBe(operationId)
  })

  it('does not require an outflow in the mapper', () => {
    const operationId = `0x${'b'.repeat(64)}`
    const input = {
      fees: [
        {
          id: `${operationId}-2`,
          contractAddress: ADDR.bank,
          feeCollector: ADDR.feeCollector,
          token: ADDR.usdcToken,
          amount: '1000000',
          timestamp: 100
        }
      ]
    }

    expect(mapBankEvents(input, ctx)).toHaveLength(1)
  })
})
