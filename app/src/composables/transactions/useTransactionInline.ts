import type { ComputedRef, Ref } from 'vue'

type TxBase = { from: string; to: string; amount: string | number; token: string }

const matchesContract = (address: string, contracts: string | string[]): boolean => {
  const lower = address?.toLowerCase() ?? ''
  return Array.isArray(contracts) ? contracts.some((a) => a === lower) : lower === contracts
}

export const useTransactionInline = (
  contractAddresses: Ref<string | string[]> | ComputedRef<string | string[]>
) => {
  const getDirection = (tx: TxBase): 'in' | 'out' | null => {
    if (Number(tx.amount) === 0 || tx.token === '-') return null
    const contracts = contractAddresses.value
    const fromIsContract = matchesContract(tx.from, contracts)
    const toIsContract = matchesContract(tx.to, contracts)
    if (!fromIsContract && toIsContract) return 'in'
    if (fromIsContract && !toIsContract) return 'out'
    return null
  }

  const getValuePrefix = (tx: TxBase): string => {
    const dir = getDirection(tx)
    return dir === 'in' ? '+' : dir === 'out' ? '-' : ''
  }

  const getValueClass = (tx: TxBase): string => {
    const dir = getDirection(tx)
    return dir === 'in' ? 'text-success font-medium' : dir === 'out' ? 'text-error font-medium' : ''
  }

  const getInlineUser = (tx: TxBase): { label: string; address: string } | null => {
    const contracts = contractAddresses.value
    const fromIsContract = matchesContract(tx.from, contracts)
    const toIsContract = matchesContract(tx.to, contracts)
    if (!fromIsContract && toIsContract) return { label: '', address: tx.from }
    if (fromIsContract && !toIsContract) return { label: '→', address: tx.to }
    return null
  }

  return { getDirection, getValuePrefix, getValueClass, getInlineUser }
}
