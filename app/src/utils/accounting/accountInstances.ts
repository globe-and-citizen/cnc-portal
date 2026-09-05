/**
 * Evidence-based resolution of deployment-specific cash accounts.
 *
 * A mapper may know a pocket directly from its emitting contract. When it does
 * not, a transaction receipt's ERC-20 `Transfer` legs can prove which known
 * company deployment sent or received the cash. This module deliberately does
 * not use activity order, timestamps, or a current deployment as evidence.
 */
import { decodeEventLog, getAddress, isAddress, type Address, type Hex } from 'viem'
import type { TeamContract, ContractType } from '@/types/teamContract'
import { accountFamilyOf, type AccountName } from './chartOfAccounts'
import type { LedgerEntry } from './ledgerEntry'

/** Cash account family owned by each company money-pocket contract type. */
const CASH_ACCOUNT_BY_CONTRACT_TYPE = {
  Safe: 'Cash — Safe',
  Bank: 'Cash — Bank',
  CashRemunerationEIP712: 'Cash — Payroll',
  ExpenseAccountEIP712: 'Cash — Expense',
  FixedReturn: 'Cash — Credit',
  SafeDepositRouter: 'Cash — Safe'
} as const satisfies Partial<Record<ContractType, AccountName>>

/** One decoded ERC-20 transfer observed in a transaction receipt. */
export interface TokenTransferEvidence {
  from: Address
  to: Address
}

/** Receipt evidence keyed by a lower-cased transaction hash. */
export type TransactionAccountEvidence = ReadonlyMap<string, readonly TokenTransferEvidence[]>

/** The receipt fields needed to decode one ERC-20 `Transfer` log. */
export interface ReceiptLog {
  data: Hex
  topics: readonly Hex[]
}

const ERC20_TRANSFER_EVENT = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' }
    ]
  }
] as const

/** Return the cash family a company contract type owns, if it owns a pocket. */
export function cashAccountForContractType(type: ContractType): AccountName | undefined {
  return CASH_ACCOUNT_BY_CONTRACT_TYPE[type as keyof typeof CASH_ACCOUNT_BY_CONTRACT_TYPE]
}

/**
 * Index the known company deployments that require their own concrete account.
 * Shared pockets such as Safe deliberately stay out of this index: their account
 * identity is not tied to a deployment address.
 */
export function knownDeploymentAccounts(
  contracts: readonly TeamContract[] | undefined
): ReadonlyMap<string, AccountName> {
  const accounts = new Map<string, AccountName>()
  for (const contract of contracts ?? []) {
    const account = cashAccountForContractType(contract.type)
    if (!account || !accountFamilyOf(account).deploymentScoped || !isAddress(contract.address)) {
      continue
    }
    accounts.set(getAddress(contract.address).toLowerCase(), account)
  }
  return accounts
}

/** Decode ERC-20 transfer directions from one mined transaction receipt. */
export function transfersFromReceiptLogs(logs: readonly ReceiptLog[]): TokenTransferEvidence[] {
  const transfers: TokenTransferEvidence[] = []
  for (const log of logs) {
    if (!log.topics.length) continue
    try {
      const decoded = decodeEventLog({
        abi: ERC20_TRANSFER_EVENT,
        data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]],
        strict: false
      })
      if (decoded.eventName !== 'Transfer') continue
      const from = decoded.args.from
      const to = decoded.args.to
      if (
        typeof from !== 'string' ||
        typeof to !== 'string' ||
        !isAddress(from) ||
        !isAddress(to)
      ) {
        continue
      }
      transfers.push({ from: getAddress(from), to: getAddress(to) })
    } catch {
      // A receipt contains many unrelated logs. Only ERC-20 Transfer logs can
      // identify a token cash pocket, so undecodable logs are irrelevant here.
    }
  }
  return transfers
}

function accountAt(
  address: string | undefined,
  accounts: ReadonlyMap<string, AccountName>
): AccountName | undefined {
  return address && isAddress(address) ? accounts.get(getAddress(address).toLowerCase()) : undefined
}

function confirmedInstance(
  account: AccountName | null,
  instance: Address | undefined,
  accounts: ReadonlyMap<string, AccountName>
): Address | undefined {
  if (!account || !accountFamilyOf(account).deploymentScoped) return instance
  return accountAt(instance, accounts) === account ? instance : undefined
}

function receiptInstance(
  account: AccountName | null,
  direction: 'debit' | 'credit',
  transfers: readonly TokenTransferEvidence[],
  accounts: ReadonlyMap<string, AccountName>
): Address | undefined {
  if (!account || !accountFamilyOf(account).deploymentScoped) return undefined
  const candidates = new Map<string, Address>()
  for (const transfer of transfers) {
    const address = direction === 'debit' ? transfer.to : transfer.from
    if (accountAt(address, accounts) === account) {
      candidates.set(address.toLowerCase(), address)
    }
  }
  return candidates.size === 1 ? [...candidates.values()][0] : undefined
}

function transactionEvidenceFor(
  txHash: string | undefined,
  evidence: TransactionAccountEvidence
): readonly TokenTransferEvidence[] {
  return txHash ? (evidence.get(txHash.toLowerCase()) ?? []) : []
}

function needsInstance(
  account: AccountName | null,
  instance: Address | undefined,
  accounts: ReadonlyMap<string, AccountName>
): boolean {
  return Boolean(
    account &&
    accountFamilyOf(account).deploymentScoped &&
    !confirmedInstance(account, instance, accounts)
  )
}

/** Whether a transaction receipt could still resolve either cash leg of an entry. */
export function needsAccountInstanceEvidence(
  entry: LedgerEntry,
  accounts: ReadonlyMap<string, AccountName>
): boolean {
  return (
    Boolean(entry.txHash) &&
    (needsInstance(entry.debit, entry.debitInstance, accounts) ||
      needsInstance(entry.credit, entry.creditInstance, accounts))
  )
}

/**
 * Keep only direct, known deployment instances and complete missing legs from
 * unambiguous receipt evidence. No evidence, a native-only transfer, or more
 * than one matching deployment intentionally remains unresolved.
 */
export function resolveAccountInstances(
  entries: readonly LedgerEntry[],
  accounts: ReadonlyMap<string, AccountName>,
  evidence: TransactionAccountEvidence = new Map()
): LedgerEntry[] {
  return entries.map((entry) => {
    const transfers = transactionEvidenceFor(entry.txHash, evidence)
    const debitInstance =
      confirmedInstance(entry.debit, entry.debitInstance, accounts) ??
      receiptInstance(entry.debit, 'debit', transfers, accounts)
    const creditInstance =
      confirmedInstance(entry.credit, entry.creditInstance, accounts) ??
      receiptInstance(entry.credit, 'credit', transfers, accounts)
    const rest = { ...entry }
    delete rest.debitInstance
    delete rest.creditInstance
    return {
      ...rest,
      ...(debitInstance ? { debitInstance } : {}),
      ...(creditInstance ? { creditInstance } : {})
    }
  })
}
