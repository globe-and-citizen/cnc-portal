import { isAddress, type Address } from 'viem'
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

export type InvestorPermissionOfficer = {
  address: Address
  isCurrent: boolean
}

type OfficerIdentitySource = {
  address: string
  isCurrent: boolean
}

const protectedTechnicalTypes = new Set(['CashRemunerationEIP712', 'SafeDepositRouter', 'Vesting'])

export function buildInvestorPermissionRows(
  accounts: readonly InvestorPermissionAccount[],
  directory?: PermissionDirectory,
  officers: readonly InvestorPermissionOfficer[] = []
): InvestorPermissionRow[] {
  return accounts.map((account) => {
    const normalized = account.address.toLowerCase()
    const member = directory?.members.find(
      (candidate) => candidate.address.toLowerCase() === normalized
    )
    const contract = directory?.teamContracts.find(
      (candidate) => candidate.address.toLowerCase() === normalized
    )
    const officer = officers.find((candidate) => candidate.address.toLowerCase() === normalized)

    return {
      address: account.address,
      label:
        member?.name ??
        contract?.type ??
        (officer ? (officer.isCurrent ? 'Officer' : 'Officer (previous)') : 'External account'),
      kind: member ? 'member' : contract || officer ? 'contract' : 'external',
      isOwner: account.isOwner,
      isAdmin: account.isAdmin === true,
      isMinter: account.isMinter === true,
      isProtectedTechnical: !!contract && protectedTechnicalTypes.has(contract.type)
    }
  })
}

export function buildInvestorPermissionOfficers(
  currentOfficer?: { address: string } | null,
  officerHistory: readonly OfficerIdentitySource[] = []
): InvestorPermissionOfficer[] {
  const byAddress = new Map<string, InvestorPermissionOfficer>()
  const candidates: OfficerIdentitySource[] = [
    ...(currentOfficer ? [{ address: currentOfficer.address, isCurrent: true }] : []),
    ...officerHistory
  ]

  for (const candidate of candidates) {
    if (!isAddress(candidate.address)) continue
    const normalized = candidate.address.toLowerCase()
    const existing = byAddress.get(normalized)
    byAddress.set(normalized, {
      address: candidate.address,
      isCurrent: candidate.isCurrent || existing?.isCurrent === true
    })
  }

  return [...byAddress.values()]
}

export function getKnownInvestorPermissionAddresses(
  directory?: PermissionDirectory,
  officers: readonly InvestorPermissionOfficer[] = []
): Address[] {
  const byAddress = new Map<string, Address>()
  const candidates = [
    directory?.members.map((member) => member.address) ?? [],
    directory?.teamContracts.map((contract) => contract.address) ?? [],
    officers.map((officer) => officer.address)
  ].flat()

  for (const candidate of candidates) {
    if (isAddress(candidate)) byAddress.set(candidate.toLowerCase(), candidate)
  }

  return [...byAddress.values()]
}

export function getGrantableInvestorAddresses(directory?: PermissionDirectory): Set<string> {
  return new Set(
    [...(directory?.members ?? []), ...(directory?.teamContracts ?? [])].map((account) =>
      account.address.toLowerCase()
    )
  )
}
