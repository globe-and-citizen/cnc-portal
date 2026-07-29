/**
 * Shared test fixtures for the accounting source mappers — a deterministic
 * {@link MapperContext} with hand-picked addresses and a stub FX rate, so each
 * mapper spec can exercise pure logic without Vue, the chain, or a price oracle.
 */
import { formatUnits, type Address } from 'viem'
import { USDC_ADDRESS, type TokenId } from '@/constant'
import { assembleCncAccounting, type CncAccounting } from '@/utils/accounting/assemble'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { MapperContext } from '@/utils/accounting/mappers/context'

/** Lowercase addresses are always valid (no checksum to fail) — safe for tests. */
export const ADDR = {
  bank: '0x1111111111111111111111111111111111111111',
  safe: '0x2222222222222222222222222222222222222222',
  payroll: '0x3333333333333333333333333333333333333333',
  expense: '0x4444444444444444444444444444444444444444',
  feeCollector: '0x5555555555555555555555555555555555555555',
  founder: '0x6666666666666666666666666666666666666666',
  client: '0x7777777777777777777777777777777777777777',
  member: '0x8888888888888888888888888888888888888888',
  usdcToken: '0x9999999999999999999999999999999999999999',
  sherToken: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  /** The FixedReturn (Community Credit) pocket. */
  credit: '0xdddddddddddddddddddddddddddddddddddddddd',
  lender: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
} as const

const POCKETS: Record<string, AccountName> = {
  [ADDR.bank]: 'Cash — Bank',
  [ADDR.safe]: 'Cash — Safe',
  [ADDR.payroll]: 'Cash — Payroll',
  [ADDR.expense]: 'Cash — Expense',
  [ADDR.credit]: 'Cash — Credit',
  [ADDR.feeCollector]: 'Cash — FeeCollector'
}

const DECIMALS: Record<TokenId, number> = { native: 18, usdc: 6, 'usdc.e': 6, usdt: 6, sher: 6 }
/** Stub rate of record: native $2, stablecoins $1, SHER $0.50. */
const RATE: Record<TokenId, number> = { native: 2, usdc: 1, 'usdc.e': 1, usdt: 1, sher: 0.5 }

/** Build a deterministic {@link MapperContext}; override any field per test. */
export function makeCtx(overrides: Partial<MapperContext> = {}): MapperContext {
  const tokenIdOf = (token: string | null | undefined): TokenId => {
    if (!token) return 'native'
    const lower = token.toLowerCase()
    if (lower === ADDR.usdcToken) return 'usdc'
    if (lower === ADDR.sherToken) return 'sher'
    return 'native'
  }
  return {
    internalAddresses: new Set(Object.keys(POCKETS) as Address[]),
    founderAddresses: new Set([ADDR.founder as Address]),
    memberAddresses: new Set([ADDR.member as Address]),
    toUsd: (amount, token) => Number(formatUnits(amount, DECIMALS[token])) * RATE[token],
    // SHER minted for a USD amount: usd / (USD-per-SHER). RATE.sher = $0.50 → ×2.
    sherForUsd: (usd) => (RATE.sher > 0 ? usd / RATE.sher : 0),
    tokenIdOf,
    pocketOf: (address) => (address ? (POCKETS[address.toLowerCase()] ?? null) : null),
    ...overrides
  }
}

/**
 * A small live book run through the whole pipeline: a $100 client deposit into the
 * Bank and a $30 expense payout. Shared by the specs that need real statements
 * rather than hand-built entries.
 */
export function sampleBooks(): CncAccounting {
  return assembleCncAccounting({
    contracts: [
      { type: 'Bank', address: ADDR.bank as Address, deployer: ADDR.bank as Address, admins: [] },
      {
        type: 'ExpenseAccountEIP712',
        address: ADDR.expense as Address,
        deployer: ADDR.bank as Address,
        admins: []
      }
    ],
    bankEvents: {
      bankDeposits: { items: [] },
      bankTokenDeposits: {
        items: [
          {
            id: 'bd1',
            contractAddress: ADDR.bank,
            depositor: ADDR.client,
            token: USDC_ADDRESS,
            amount: '100000000', // 100 USDC, ts 100
            timestamp: 100
          }
        ]
      },
      bankTransfers: { items: [] },
      bankTokenTransfers: { items: [] },
      bankDividendDistributionTriggereds: { items: [] },
      bankFeePaids: { items: [] },
      bankOwnershipTransferreds: { items: [] },
      rawContractTokenTransfers: { items: [] }
    },
    expenseEvents: {
      expenseDeposits: { items: [] },
      expenseTokenDeposits: { items: [] },
      expenseTransfers: { items: [] },
      expenseTokenTransfers: {
        items: [
          {
            id: 'et1',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.expense,
            to: ADDR.member,
            token: USDC_ADDRESS,
            amount: '30000000', // 30 USDC, ts 200
            timestamp: 200
          }
        ]
      },
      expenseApprovals: { items: [] },
      expenseOwnerTreasuryWithdrawNatives: { items: [] },
      expenseOwnerTreasuryWithdrawTokens: { items: [] },
      expenseTokenSupportAddeds: { items: [] },
      expenseTokenSupportRemoveds: { items: [] },
      expenseTokenAddressChangeds: { items: [] }
    }
  })
}
