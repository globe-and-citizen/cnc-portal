import { describe, expect, it } from 'vitest'
import { getAddress, type Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import type { TeamContract } from '@/types/teamContract'
import { journalLedgerRows } from '../journalLedgerPresenter'
import { assembleAccounting } from './assembleAccounting'
import { ADDR } from './fixtures'
import { transfer, tx } from './safeExchangeFixtures'

const OLD_SAFE = ADDR.safe
const NEW_SAFE = '0x2424242424242424242424242424242424242424'
const ROUTER = '0x2525252525252525252525252525252525252525'

const CONTRACTS: TeamContract[] = [
  { type: 'Safe', address: OLD_SAFE as Address, deployer: ADDR.founder as Address, admins: [] },
  { type: 'Safe', address: NEW_SAFE as Address, deployer: ADDR.founder as Address, admins: [] },
  {
    type: 'SafeDepositRouter',
    address: ROUTER as Address,
    deployer: ADDR.founder as Address,
    admins: []
  }
]

const safeAccount = (address: string) => `cash-safe:${getAddress(address).toLowerCase()}`

/** Old Safe receives 20 USDC, sends 15 to the new Safe; the new Safe then receives 5 more. */
function accounting() {
  const move = transfer(2, 0, OLD_SAFE, NEW_SAFE, USDC_ADDRESS, '15000000')
  return assembleAccounting({
    contracts: CONTRACTS,
    rateOfRecord: () => 1,
    safeAddress: NEW_SAFE,
    safeAssetTransfers: [
      move,
      transfer(3, 0, ADDR.client, NEW_SAFE, USDC_ADDRESS, '5000000'),
      transfer(4, 0, ROUTER, NEW_SAFE, USDC_ADDRESS, '2000000')
    ],
    previousSafes: [
      {
        safeAddress: OLD_SAFE,
        assetTransfers: [transfer(1, 0, ADDR.client, OLD_SAFE, USDC_ADDRESS, '20000000'), move]
      }
    ],
    safeDepositRouterEvents: {
      safeDeposits: {
        items: [
          {
            id: `${tx(4)}-1`,
            txHash: tx(4),
            contractAddress: ROUTER,
            depositor: ADDR.client,
            token: USDC_ADDRESS,
            tokenAmount: '2000000',
            sherAmount: '2000000',
            timestamp: 1_780_574_400
          }
        ]
      },
      safeDepositsEnableds: { items: [] },
      safeDepositsDisableds: { items: [] },
      safeAddressUpdateds: { items: [] },
      safeMultiplierUpdateds: { items: [] }
    }
  })
}

describe('[US-SAFE-001] accounting for a team with several Safes', () => {
  it('[AC-US-SAFE-001-20] books each Safe in its own Cash — Safe account', () => {
    const accounts = new Set(
      accounting()
        .journal.flatMap((entry) => entry.lines)
        .filter((line) => line.account.family.name === 'Cash — Safe')
        .map((line) => line.account.id)
    )

    expect(accounts).toEqual(new Set([safeAccount(OLD_SAFE), safeAccount(NEW_SAFE)]))
  })

  it('[AC-US-SAFE-001-20] books a move between two team Safes once, as an internal move', () => {
    const moves = accounting().journal.filter(
      (entry) => entry.sourceOperationId?.toLowerCase() === tx(2)
    )

    expect(moves).toHaveLength(1)
    expect(moves[0]).toMatchObject({ internal: true })
    expect(moves[0]!.lines.map((line) => line.account.id)).toEqual([
      safeAccount(NEW_SAFE),
      safeAccount(OLD_SAFE)
    ])
  })

  it('[AC-US-SAFE-001-20] books a router deposit in the Safe that received it', () => {
    const deposit = accounting().journal.find((entry) => entry.useCase === 'UC-SDR-01')!

    expect(deposit.lines[0]!.account.id).toBe(safeAccount(NEW_SAFE))
  })

  it('[AC-US-SAFE-001-20] numbers the Safe accounts in the order they were first used', () => {
    const labels = new Map(
      journalLedgerRows(accounting().journal)
        .filter((row) => row.account === 'Cash — Safe')
        .map((row) => [row.accountId, row.accountLabel ?? row.account])
    )

    expect(labels.get(safeAccount(OLD_SAFE))).toBe('Cash — Safe')
    expect(labels.get(safeAccount(NEW_SAFE))).toBe('Cash — Safe 2')
  })
})
