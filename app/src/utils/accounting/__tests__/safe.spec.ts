import { describe, it, expect } from 'vitest'
import { mapSafeTransfers } from '@/utils/accounting/mappers/safe'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()
const base = { token: null as string | null, amount: '1000000000000000000', timestamp: 100 }

describe('mapSafeTransfers', () => {
  it('books a founder inflow as UC-BANK-01 (Owner Capital)', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'i1', from: ADDR.founder, to: ADDR.safe }]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-BANK-01',
      debit: 'Cash — Safe',
      credit: 'Owner Capital'
    })
  })

  it('books a client inflow as UC-BANK-02 (Service Revenue)', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'i2', from: ADDR.client, to: ADDR.safe }]
      },
      ctx
    )
    expect(entry).toMatchObject({ useCase: 'UC-BANK-02', credit: 'Service Revenue' })
  })

  it('books a member inflow as UC-MEMBER-01 (Investor Equity — invest & get SHER)', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'i2b', from: ADDR.member, to: ADDR.safe }]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-MEMBER-01',
      debit: 'Cash — Safe',
      credit: 'Investor Equity',
      shares: 4 // $2 invested ÷ $0.50 per SHER (multiplier 2x)
    })
  })

  it('books an inflow from an internal pocket as an internal move', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'i3', from: ADDR.bank, to: ADDR.safe }]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'INTERNAL',
      debit: 'Cash — Safe',
      credit: 'Cash — Bank',
      internal: true
    })
  })

  it('books an outflow to an internal pocket as an internal move', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'o1', from: ADDR.safe, to: ADDR.bank }]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'INTERNAL',
      debit: 'Cash — Bank',
      credit: 'Cash — Safe',
      internal: true
    })
  })

  it('flags an external outflow for off-chain reclassification', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'o2', from: ADDR.safe, to: ADDR.client }]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'CASH-OUT',
      credit: 'Cash — Safe',
      enrichment: 'needs-off-chain-data'
    })
  })

  it('skips a transfer that touches neither side of the Safe', () => {
    const entries = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'n1', from: ADDR.bank, to: ADDR.client }]
      },
      ctx
    )
    expect(entries).toHaveLength(0)
  })
})
