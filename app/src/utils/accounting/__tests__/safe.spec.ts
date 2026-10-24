import { describe, it, expect } from 'vitest'
import { USDC_ADDRESS } from '@/constant'
import { mapSafeTransfers } from '@/utils/accounting/mappers/safe'
import { assetMetadata } from '@/utils/tokens/assets'
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

  it('flags an external outflow for an off-chain account assignment', () => {
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

  it('books CNC tokens and trusted assets but ignores tokens Safe does not trust', () => {
    const fake = '0x000000000000000000000000000000000000dEaD'
    const info = { address: fake, symbol: 'FAKE', name: 'Fake', decimals: 18 }
    const entries = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [
          {
            ...base,
            id: 'f1',
            token: fake,
            from: ADDR.client,
            to: ADDR.safe,
            asset: assetMetadata(fake, 137, { ...info, trusted: false })
          },
          {
            ...base,
            id: 'f2',
            token: fake,
            from: ADDR.client,
            to: ADDR.safe,
            asset: assetMetadata(fake, 137, info)
          },
          {
            ...base,
            id: 't1',
            token: fake,
            from: ADDR.client,
            to: ADDR.safe,
            asset: assetMetadata(fake, 137, { ...info, trusted: true })
          },
          { ...base, id: 'u1', token: USDC_ADDRESS, from: ADDR.client, to: ADDR.safe }
        ]
      },
      ctx
    )
    expect(entries.map((entry) => entry.id)).toEqual(['t1', 'u1'])
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
