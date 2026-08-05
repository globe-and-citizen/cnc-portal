import { describe, expect, it } from 'vitest'
import { formatContractFunctionLabel, getContractPresentation } from '../contractPresentation'

describe('getContractPresentation', () => {
  it.each([
    ['BoardOfDirectors', 'Board of Directors', 'i-lucide-users-round'],
    ['ExpenseAccountEIP712', 'Expense account', 'i-lucide-receipt-text'],
    ['CashRemunerationEIP712', 'Payroll account', 'i-lucide-wallet-cards'],
    ['InvestorV1', 'Share token', 'i-lucide-chart-no-axes-combined']
  ])('maps %s to a business-facing presentation', (type, label, icon) => {
    expect(getContractPresentation(type)).toEqual({ label, icon })
  })

  it('turns an unknown contract type into a readable fallback', () => {
    expect(getContractPresentation('CustomTreasury')).toEqual({
      label: 'Custom Treasury',
      icon: 'i-lucide-file-code-2'
    })
  })

  it('formats contract read function names for display', () => {
    expect(formatContractFunctionLabel('getSupportedTokens')).toBe('Get Supported Tokens')
    expect(formatContractFunctionLabel('UPGRADE_INTERFACE_VERSION')).toBe(
      'UPGRADE INTERFACE VERSION'
    )
  })
})
