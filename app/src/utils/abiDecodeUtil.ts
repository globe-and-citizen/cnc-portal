import { BANK_ABI } from '@/artifacts/abi/bank'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { EXPENSE_ACCOUNT_EIP712_ABI } from '@/artifacts/abi/expense-account-eip712'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import { SAFE_DEPOSIT_ROUTER_ABI } from '@/artifacts/abi/safe-deposit-router'
import { ELECTIONS_ABI } from '@/artifacts/abi/elections'
import { PROPOSALS_ABI } from '@/artifacts/abi/proposals'
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

export const CONTRACT_ABI_MAP: Record<string, Abi> = {
  Bank: BANK_ABI,
  InvestorV1: INVESTOR_ABI,
  ExpenseAccountEIP712: EXPENSE_ACCOUNT_EIP712_ABI,
  CashRemunerationEIP712: CASH_REMUNERATION_EIP712_ABI,
  SafeDepositRouter: SAFE_DEPOSIT_ROUTER_ABI,
  Elections: ELECTIONS_ABI,
  Proposals: PROPOSALS_ABI
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
