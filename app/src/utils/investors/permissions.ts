import type { Address } from 'viem'
import type { InvestorPermissionAccount } from '@/queries/investorPermissions.queries'
import type { Team } from '@/types/team'

export type InvestorPermissionRow = {
  address: Address
  label: string
  kind: 'member' | 'contract' | 'external'
  isOwner: boolean
  isAdmin: boolean
  isMinter: boolean
  isProtectedTechnical: boolean
}

type PermissionDirectory = Pick<Team, 'members' | 'teamContracts'>

const protectedTechnicalTypes = new Set(['CashRemunerationEIP712', 'SafeDepositRouter', 'Vesting'])

export function buildInvestorPermissionRows(
  accounts: readonly InvestorPermissionAccount[],
  directory?: PermissionDirectory
): InvestorPermissionRow[] {
  return accounts.map((account) => {
    const normalized = account.address.toLowerCase()
    const member = directory?.members.find(
      (candidate) => candidate.address.toLowerCase() === normalized
    )
    const contract = directory?.teamContracts.find(
      (candidate) => candidate.address.toLowerCase() === normalized
    )

    return {
      address: account.address,
      label: member?.name ?? contract?.type ?? 'External account',
      kind: member ? 'member' : contract ? 'contract' : 'external',
      isOwner: account.isOwner,
      isAdmin: account.isAdmin === true,
      isMinter: account.isMinter === true,
      isProtectedTechnical: !!contract && protectedTechnicalTypes.has(contract.type)
    }
  })
}

export function getGrantableInvestorAddresses(directory?: PermissionDirectory): Set<string> {
  return new Set(
    [...(directory?.members ?? []), ...(directory?.teamContracts ?? [])].map((account) =>
      account.address.toLowerCase()
    )
  )
}
