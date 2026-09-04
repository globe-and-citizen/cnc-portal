import { describe, it, expect } from 'vitest'
import { mapSafeTransfers } from '@/utils/accounting/mappers/safe'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()
const base = { token: null as string | null, amount: '1000000000000000000', timestamp: 100 }

describe('mapSafeTransfers', () => {
  it('books a founder inflow as UC-BANK-02 (Service Revenue)', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'i1', from: ADDR.founder, to: ADDR.safe }]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-BANK-02',
      debit: 'Cash — Safe',
      credit: 'Service Revenue'
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

  it('propagates the transaction hash from an indexed Safe event', () => {
    const txHash = `0x${'d'.repeat(64)}`
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: `${txHash}-3`, from: ADDR.client, to: ADDR.safe }]
      },
      ctx
    )

    expect(entry).toMatchObject({ sourceOperationId: txHash, txHash })
  })

  it('books a member inflow as UC-BANK-02 (Service Revenue)', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'i2b', from: ADDR.member, to: ADDR.safe }]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-BANK-02',
      debit: 'Cash — Safe',
      credit: 'Service Revenue'
    })
  })

  it('does not let a legacy classification reclassify a direct inflow', () => {
    const classifiedCtx = makeCtx({
      classificationOf: (id) =>
        id === 'i2-classified' ? { category: 'SHAREHOLDER_LOAN' } : undefined
    })
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'i2-classified', from: ADDR.member, to: ADDR.safe }]
      },
      classifiedCtx
    )

    expect(entry).toMatchObject({
      useCase: 'UC-BANK-02',
      debit: 'Cash — Safe',
      credit: 'Service Revenue'
    })
    expect(entry).not.toHaveProperty('classified')
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

  it('does not let a legacy classification alter an internal outflow', () => {
    const classifiedCtx = makeCtx({
      classificationOf: (id) => (id === 'o1' ? { category: 'INTERNAL_TRANSFER' } : undefined)
    })
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [{ ...base, id: 'o1', from: ADDR.safe, to: ADDR.bank }]
      },
      classifiedCtx
    )
    expect(entry).toMatchObject({
      useCase: 'INTERNAL',
      debit: 'Cash — Bank',
      credit: 'Cash — Safe',
      internal: true
    })
    expect(entry).not.toHaveProperty('classified')
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
