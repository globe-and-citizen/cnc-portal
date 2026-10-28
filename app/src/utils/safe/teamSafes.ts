import type { TeamContract } from '@/types'

/** Every Safe the team registered, disabled ones included, latest activated first. */
export function teamSafes(contracts: readonly TeamContract[] | undefined): TeamContract[] {
  return (contracts ?? [])
    .filter((contract) => contract.type === 'Safe')
    .sort((a, b) => Date.parse(b.activatedAt ?? '') - Date.parse(a.activatedAt ?? '') || 0)
}

/** The team's default Safe: the latest activated one not disabled. */
export function defaultTeamSafe(
  contracts: readonly TeamContract[] | undefined
): TeamContract | undefined {
  return teamSafes(contracts).find((safe) => !safe.removedAt)
}

/** The team's contracts in use: every contract that is not a Safe, plus the default Safe. */
export function contractsInUse(contracts: readonly TeamContract[] | undefined): TeamContract[] {
  const defaultSafe = defaultTeamSafe(contracts)
  return [
    ...(contracts ?? []).filter((contract) => contract.type !== 'Safe'),
    ...(defaultSafe ? [defaultSafe] : [])
  ]
}
