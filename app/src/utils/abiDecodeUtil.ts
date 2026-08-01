import {
  bankAbi,
  cashRemunerationEip712Abi,
  electionsAbi,
  expenseAccountEip712Abi,
  investorAbi,
  proposalsAbi,
  safeDepositRouterAbi
} from '@/artifacts/abi/generated'
import type { Abi } from 'viem'

export interface DecodedParam {
  name: string
  type: string
  display: string
  isAddress: boolean
}

export interface DecodedInputData {
  functionName: string
  params: DecodedParam[]
}

// Keyed by `TeamContract.type`. Teams on legacy Officer generations still carry
// the 'InvestorV1' type, so both keys must resolve — decoding a legacy call with
// the current ABI is fine, since the selectors they share are unchanged and the
// v2-only ones simply never appear in a legacy transaction.
export const CONTRACT_ABI_MAP: Record<string, Abi> = {
  Bank: bankAbi,
  Investor: investorAbi,
  InvestorV1: investorAbi,
  ExpenseAccountEIP712: expenseAccountEip712Abi,
  CashRemunerationEIP712: cashRemunerationEip712Abi,
  SafeDepositRouter: safeDepositRouterAbi,
  Elections: electionsAbi,
  Proposals: proposalsAbi
}

export const formatDecodedValue = (
  type: string,
  value: unknown
): { display: string; isAddress: boolean } => {
  if (value === null || value === undefined) return { display: '-', isAddress: false }
  if (type === 'address') return { display: String(value), isAddress: true }
  if (typeof value === 'bigint') return { display: value.toLocaleString(), isAddress: false }
  if (Array.isArray(value)) {
    const innerType = type.replace(/\[\d*\]$/, '')
    const items = value.map((v) => formatDecodedValue(innerType, v).display)
    return { display: `[${items.join(', ')}]`, isAddress: false }
  }
  if (typeof value === 'object') {
    try {
      const filtered = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(([k]) => isNaN(Number(k)))
      )
      const serialized = JSON.stringify(filtered, (_k, v) =>
        typeof v === 'bigint' ? v.toLocaleString() : v
      )
      return { display: serialized ?? '-', isAddress: false }
    } catch {
      return { display: '-', isAddress: false }
    }
  }
  return { display: String(value), isAddress: false }
}
