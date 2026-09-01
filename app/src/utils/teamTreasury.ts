import type { Address } from 'viem'
import type { ContractBalances, Team } from '@/types'
import { EMPTY_VALUE, formatCurrency, formatPercent } from '@/utils/format'

type TreasuryContractType = 'Bank' | 'Safe' | 'ExpenseAccountEIP712' | 'CashRemunerationEIP712'

interface TreasuryAccountDefinition {
  contractType: TreasuryContractType
  label: string
  barClass: string
}

const TREASURY_ACCOUNTS: readonly TreasuryAccountDefinition[] = [
  { contractType: 'Bank', label: 'Bank', barClass: 'bg-primary/40' },
  { contractType: 'Safe', label: 'Safe', barClass: 'bg-primary' },
  { contractType: 'ExpenseAccountEIP712', label: 'Expense', barClass: 'bg-accent' },
  { contractType: 'CashRemunerationEIP712', label: 'Cash', barClass: 'bg-warning' }
]

export interface TeamTreasuryAccountShare {
  label: string
  barClass: string
  percent: number
  percentLabel: string
}

export interface TeamTreasuryDisplay {
  state: 'loading' | 'unavailable' | 'ready'
  formattedTotal: string
  accountShares: TeamTreasuryAccountShare[]
}

interface ReadTreasuryAccount extends TreasuryAccountDefinition {
  address: Address
  amount: number
}

const addressKey = (address: Address) => address.toLowerCase()

/**
 * Returns the money-holding contract addresses that contribute to one company's
 * list-card summary. The list query uses this to deduplicate reads across cards.
 */
export function getTeamTreasuryAddresses(team: Team): Address[] {
  return TREASURY_ACCOUNTS.flatMap(({ contractType }) => {
    const address = team.teamContracts?.find((contract) => contract.type === contractType)?.address
    return address ? [address] : []
  })
}

/**
 * Converts cached account balances into the display contract consumed by a
 * company card. Missing or failed reads stay unavailable; they are never
 * represented as a zero balance.
 */
export function buildTeamTreasuryDisplay(
  team: Team,
  balancesByAddress: Readonly<Record<string, ContractBalances>>,
  isLoading: boolean,
  currency: string
): TeamTreasuryDisplay {
  const accounts = TREASURY_ACCOUNTS.map((definition) => {
    const address = team.teamContracts?.find(
      (contract) => contract.type === definition.contractType
    )?.address
    const balance = address ? balancesByAddress[addressKey(address)] : undefined

    return {
      ...definition,
      address,
      amount: balance?.total.local.value
    }
  })
  const hasTreasuryAccount = accounts.some((account) => account.address)

  if (isLoading && hasTreasuryAccount) {
    return { state: 'loading', formattedTotal: EMPTY_VALUE, accountShares: [] }
  }

  const readAccounts = accounts.filter(
    (account): account is ReadTreasuryAccount => account.amount !== undefined
  )

  if (readAccounts.length === 0) {
    return { state: 'unavailable', formattedTotal: EMPTY_VALUE, accountShares: [] }
  }

  const total = readAccounts.reduce((sum, account) => sum + account.amount, 0)
  const accountShares =
    total > 0
      ? readAccounts
          .filter((account) => account.amount > 0)
          .map((account) => ({
            label: account.label,
            barClass: account.barClass,
            percent: (account.amount / total) * 100,
            percentLabel: formatPercent(account.amount / total, { decimals: 0 })
          }))
      : []

  return {
    state: 'ready',
    formattedTotal: formatCurrency(total, { currency }),
    accountShares
  }
}
