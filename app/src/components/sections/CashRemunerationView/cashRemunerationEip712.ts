import type { Address } from 'viem'

export const CASH_REMUNERATION_EIP712_TYPES = {
  Wage: [
    { name: 'hourlyRate', type: 'uint256' },
    { name: 'tokenAddress', type: 'address' }
  ],
  WageClaim: [
    { name: 'employeeAddress', type: 'address' },
    { name: 'minutesWorked', type: 'uint16' },
    { name: 'wages', type: 'Wage[]' },
    { name: 'date', type: 'uint256' }
  ]
} as const

export const buildCashRemunerationDomain = (params: {
  chainId: number
  verifyingContract: Address
}) => ({
  name: 'CashRemuneration',
  version: '1',
  chainId: params.chainId,
  verifyingContract: params.verifyingContract
})
