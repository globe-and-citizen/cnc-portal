interface ContractPresentation {
  label: string
  icon: string
}

const CONTRACT_PRESENTATION: Record<string, ContractPresentation> = {
  Bank: { label: 'Bank', icon: 'i-lucide-landmark' },
  Safe: { label: 'Safe account', icon: 'i-lucide-shield-check' },
  SafeDepositRouter: { label: 'Safe deposit router', icon: 'i-lucide-route' },
  ExpenseAccountEIP712: { label: 'Expense account', icon: 'i-lucide-receipt-text' },
  CashRemunerationEIP712: { label: 'Payroll account', icon: 'i-lucide-wallet-cards' },
  BoardOfDirectors: { label: 'Board of Directors', icon: 'i-lucide-users-round' },
  Investor: { label: 'Share token', icon: 'i-lucide-chart-no-axes-combined' },
  InvestorV1: { label: 'Share token', icon: 'i-lucide-chart-no-axes-combined' },
  Voting: { label: 'Voting', icon: 'i-lucide-vote' },
  Elections: { label: 'Elections', icon: 'i-lucide-badge-check' },
  Proposals: { label: 'Proposals', icon: 'i-lucide-scroll-text' },
  Vesting: { label: 'Vesting', icon: 'i-lucide-calendar-clock' },
  FixedReturn: { label: 'Fixed return', icon: 'i-lucide-percent' }
}

export function getContractPresentation(type: string): ContractPresentation {
  return (
    CONTRACT_PRESENTATION[type] ?? {
      label: type.replace(/([a-z])([A-Z])/g, '$1 $2'),
      icon: 'i-lucide-file-code-2'
    }
  )
}
