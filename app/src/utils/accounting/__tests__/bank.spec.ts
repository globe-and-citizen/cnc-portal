import { describe, it, expect } from 'vitest'
import { getAddress } from 'viem'
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

  it('[AC-US-ACCT-005-04] sweeps an old Bank into its replacement as an internal move', () => {
    // A redeployment leaves two Bank generations, both mapping to Cash — Bank.
    const REPLACEMENT_BANK = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    const generations = [ADDR.bank, REPLACEMENT_BANK]
    const migrating = makeCtx({
      internalAddresses: new Set(generations as Address[]),
      pocketOf: (address) =>
        address && generations.includes(address.toLowerCase()) ? 'Cash — Bank' : null
    })

    const [entry] = mapBankEvents(
      {
        transfers: [
          {
            id: 'sweep',
            contractAddress: ADDR.bank,
            sender: ADDR.bank,
            to: REPLACEMENT_BANK,
            amount: '9000000',
            timestamp: 100
          }
        ]
      },
      migrating
    )

    expect(entry).toMatchObject({
      useCase: 'UC-BANK-03',
      debit: 'Cash — Bank',
      credit: 'Cash — Bank',
      internal: true
    })
    // Each leg stays on the deployment that actually held the cash.
    expect(entry!.debitInstance?.toLowerCase()).toBe(REPLACEMENT_BANK)
    expect(entry!.creditInstance?.toLowerCase()).toBe(ADDR.bank)
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

describe('mapBankEvents — plain token transfers into the Bank', () => {
  const rawTransfer = (from: string, to: string = ADDR.bank) => ({
    id: `0x${'ab'.repeat(32)}-3`,
    tokenAddress: ADDR.usdcToken,
    contractAddress: ADDR.bank,
    direction: to === ADDR.bank ? 'in' : 'out',
    from,
    to,
    amount: '200050000',
    timestamp: 100
  })
  const ctxWithCredit = makeCtx({ internalAddresses: new Set([getAddress(ADDR.credit)]) })

  it('books a plain transfer from outside the CNC as a UC-BANK-02 deposit', () => {
    const [entry] = mapBankEvents({ rawTransfers: [rawTransfer(ADDR.founder)] }, ctxWithCredit)

    expect(entry).toMatchObject({
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      debitInstance: ADDR.bank,
      credit: 'Service Revenue',
      token: 'usdc',
      counterparty: ADDR.founder
    })
    expect(draftUsdValue(entry)).toBe(200.05)
  })

  it('leaves a transfer sent by a CNC contract to that contract’s own event', () => {
    expect(mapBankEvents({ rawTransfers: [rawTransfer(ADDR.credit)] }, ctxWithCredit)).toEqual([])
  })

  it('ignores a plain transfer leaving the Bank', () => {
    const outgoing = rawTransfer(ADDR.bank, ADDR.client)
    expect(mapBankEvents({ rawTransfers: [outgoing] }, ctxWithCredit)).toEqual([])
  })
})
