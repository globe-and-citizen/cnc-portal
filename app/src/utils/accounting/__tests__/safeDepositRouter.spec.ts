import { describe, it, expect } from 'vitest'
import { mapSafeDepositRouterEvents } from '@/utils/accounting/mappers/safeDepositRouter'
import { makeCtx, ADDR, draftUsdValue } from './fixtures'

const ctx = makeCtx()

describe('mapSafeDepositRouterEvents', () => {
  it('books an investment as UC-SDR-01 (Cash — Safe → Investor Equity)', () => {
    const [entry] = mapSafeDepositRouterEvents(
      {
        deposits: [
          {
            id: 'sd1',
            txHash: '0xrouterdeposit',
            contractAddress: ADDR.safe,
            depositor: ADDR.client,
            token: ADDR.usdcToken,
            tokenAmount: '5000000',
            sherAmount: '10000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-SDR-01',
      debit: 'Cash — Safe',
      credit: 'Investor Equity',
      shares: 10, // 10 SHER minted
      token: 'usdc',
      txHash: '0xrouterdeposit',
      internal: false
    })
    expect(draftUsdValue(entry)).toBe(5) // 5 USDC deposited * $1
  })

  it('values a native deposit at the rate of record', () => {
    const [entry] = mapSafeDepositRouterEvents(
      {
        deposits: [
          {
            id: 'sd2',
            contractAddress: ADDR.safe,
            depositor: ADDR.client,
            token: '',
            tokenAmount: '1000000000000000000',
            sherAmount: '2000000',
            timestamp: 100
          }
        ]
      },
      ctx
    )
    expect(entry).toMatchObject({ token: 'native', shares: 2 })
    expect(draftUsdValue(entry)).toBe(2)
  })
})
