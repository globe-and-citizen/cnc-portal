import { keccak256, parseAbi, toBytes, zeroHash, type Address } from 'viem'
import { investorAbi } from '@/artifacts/abi/generated'
import { START_BLOCK, type ChainClient } from '@/composables/eventsViaLogs'

export const DEFAULT_ADMIN_ROLE = zeroHash
export const MINTER_ROLE = keccak256(toBytes('MINTER_ROLE'))

const roleEventAbi = parseAbi([
  'event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)',
  'event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)'
])

export type InvestorPermissionEvidence = 'complete' | 'partial' | 'unavailable'

export interface InvestorPermissionAccount {
  address: Address
  isOwner: boolean
  isAdmin: boolean | null
  isMinter: boolean | null
}

export interface InvestorPermissionsResult {
  accounts: InvestorPermissionAccount[]
  evidence: InvestorPermissionEvidence
  gaps: string[]
}

function uniqueAddresses(addresses: readonly Address[]): Address[] {
  const byAddress = new Map<string, Address>()
  for (const address of addresses) byAddress.set(address.toLowerCase(), address)
  return [...byAddress.values()]
}

/**
 * Reconstructs AccessControl candidates from immutable role events, then verifies current state
 * with hasRole. Known team accounts keep the result useful when an RPC cannot serve old logs;
 * evidence status makes that incomplete discovery explicit to the UI.
 */
export async function fetchInvestorPermissions(
  client: ChainClient,
  investorAddress: Address,
  knownAccounts: readonly Address[]
): Promise<InvestorPermissionsResult> {
  const gaps: string[] = []
  let owner: Address

  try {
    owner = (await client.readContract({
      address: investorAddress,
      abi: investorAbi,
      functionName: 'owner'
    })) as Address
  } catch {
    return {
      accounts: [],
      evidence: 'unavailable',
      gaps: ['Investor ownership could not be read.']
    }
  }

  const logResult = await Promise.allSettled(
    roleEventAbi.map((event) =>
      client.getLogs({
        address: investorAddress,
        event,
        fromBlock: START_BLOCK,
        toBlock: 'latest'
      })
    )
  )

  const eventAccounts: Address[] = []
  logResult.forEach((result, index) => {
    if (result.status === 'rejected') {
      gaps.push(`${roleEventAbi[index]?.name ?? 'Role'} history could not be scanned.`)
      return
    }
    for (const log of result.value) {
      const account = (log.args as { account?: Address }).account
      if (account) eventAccounts.push(account)
    }
  })

  const candidates = uniqueAddresses([owner, ...knownAccounts, ...eventAccounts])
  const accounts = await Promise.all(
    candidates.map(async (address): Promise<InvestorPermissionAccount> => {
      const [isAdmin, isMinter] = await Promise.allSettled([
        client.readContract({
          address: investorAddress,
          abi: investorAbi,
          functionName: 'hasRole',
          args: [DEFAULT_ADMIN_ROLE, address]
        }),
        client.readContract({
          address: investorAddress,
          abi: investorAbi,
          functionName: 'hasRole',
          args: [MINTER_ROLE, address]
        })
      ] as const)
      if (isAdmin.status === 'rejected' || isMinter.status === 'rejected') {
        gaps.push(`Roles could not be fully verified for ${address}.`)
      }

      return {
        address,
        isOwner: address.toLowerCase() === owner.toLowerCase(),
        isAdmin: isAdmin.status === 'fulfilled' ? Boolean(isAdmin.value) : null,
        isMinter: isMinter.status === 'fulfilled' ? Boolean(isMinter.value) : null
      }
    })
  )

  const visibleAccounts = accounts.filter(
    (account) => account.isOwner || account.isAdmin === true || account.isMinter === true
  )
  const failedLogScans = logResult.filter((result) => result.status === 'rejected').length
  const failedRoleReads = accounts.some(
    (account) => account.isAdmin === null || account.isMinter === null
  )

  return {
    accounts: visibleAccounts,
    evidence:
      failedLogScans === logResult.length
        ? 'unavailable'
        : failedLogScans > 0 || failedRoleReads
          ? 'partial'
          : 'complete',
    gaps
  }
}
