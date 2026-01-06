import { BANK_ABI } from '@/artifacts/abi/bank'
import { FEE_COLLECTOR_ABI } from '~/artifacts/abi/feeCollector'

export type AbiName = 'Bank' | 'FeeCollector' // add more as needed

export const ABI_MAP: Record<AbiName, readonly unknown[]> = {
  Bank: BANK_ABI,
  FeeCollector: FEE_COLLECTOR_ABI
}

export const ABI_OPTIONS = [
  { label: 'Bank', value: 'Bank' },
  { label: 'FeeCollector', value: 'FeeCollector' }
]
