import { describe, it, expect } from 'vitest'
import { mapBankEvents } from '@/utils/accounting/mappers/bank'
import { mapFees } from '@/utils/accounting/mappers/fees'
import { buildGeneralLedger, buildJournal } from '@/utils/accounting/generalLedger'
import { entriesForAccount } from '@/utils/accounting/accountLedger'
import { makeCtx } from './fixtures'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'

const BANK_A = '0x1111111111111111111111111111111111111111'
const BANK_B = '0x2222222222222222222222222222222222222222'
const PAYROLL = '0x3333333333333333333333333333333333333333'
const FOUNDER = '0x6666666666666666666666666666666666666666'
const USDC = '0x9999999999999999999999999999999999999999'
const TX = '0xdeadbeef00000000000000000000000000000000000000000000000000000001'

// Two Bank deployments + a payroll pocket, so a transfer out of BANK_A carries a
// fee skimmed from BANK_A — the PDF's "Bank transferred money to Payroll" case.
const ctx = makeCtx({
  founderAddresses: new Set([FOUNDER as `0x${string}`]),
  pocketOf: (address) => {
    const a = address?.toLowerCase()
    if (a === BANK_A || a === BANK_B) return 'Cash — Bank' as AccountName
    if (a === PAYROLL) return 'Cash — Payroll' as AccountName
    return null
  }
})

describe('repro: Bank 2 transfer fee on the trial balance', () => {
  // A deposit establishes BANK_B as an instance; the transfer establishes BANK_A.
  const bankEntries = mapBankEvents(
    {
      tokenDeposits: [
        {
          id: 'd1',
          contractAddress: BANK_B,
          depositor: FOUNDER,
          token: USDC,
          amount: '200000000', // 200 USDC into BANK_B, ts 100
          timestamp: 100
        }
      ],
      tokenTransfers: [
        {
          id: `${TX}-5`,
          contractAddress: BANK_A,
          to: PAYROLL,
          token: USDC,
          amount: '100000000', // 100 USDC BANK_A -> Payroll, ts 300
          timestamp: 300
        }
      ]
    },
    ctx
  )
  const feeEntries = mapFees(
    {
      bankFeePaids: [
        {
          id: `${TX}-3`,
          contractAddress: BANK_A,
          feeCollector: '0x5555555555555555555555555555555555555555',
          token: USDC,
          amount: '500000', // 0.5 USDC fee skimmed from BANK_A
          timestamp: 300
        }
      ]
    },
    ctx
  )
  const entries = [...bankEntries, ...feeEntries]

  it('books the fee on the same Bank deployment as its transfer (BANK_A)', () => {
    const fee = entries.find((e) => e.useCase === 'FEE')!
    expect(fee.creditInstance?.toLowerCase()).toBe(BANK_A)
  })

  it('rolls the fee into BANK_A on the trial balance, not the other deployment', () => {
    const gl = buildGeneralLedger(buildJournal(entries))
    const bankRows = gl.trialBalance.filter((r) => r.account === 'Cash — Bank')
    const rowA = bankRows.find((r) => r.instance?.toLowerCase() === BANK_A)
    const rowB = bankRows.find((r) => r.instance?.toLowerCase() === BANK_B)
    // BANK_A sent 100 net + 0.5 fee = 100.5 gross out.
    expect(rowA?.totalCredit).toBe(100.5)
    // The fee must NOT have leaked onto BANK_B (the other deployment).
    expect(rowB?.totalCredit ?? 0).toBe(0)
  })

  it('shows the fee inside the BANK_A drill-down', () => {
    const scoped = entriesForAccount(entries, 'Cash — Bank', null, null, { instance: BANK_A })
    expect(scoped.some((e) => e.useCase === 'FEE')).toBe(true)
  })
})
