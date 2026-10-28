import type { TeamContract } from '~/types'

/**
 * A team's contracts in use: every contract that is not a Safe, plus its default Safe, the
 * latest activated one not disabled. The team payload lists every Safe it registered.
 */
export function contractsInUse(contracts: readonly TeamContract[] | undefined): TeamContract[] {
  const defaultSafe = (contracts ?? [])
    .filter(contract => contract.type === 'Safe' && !contract.removedAt)
    .sort((a, b) => Date.parse(b.activatedAt) - Date.parse(a.activatedAt))[0]
  return [
    ...(contracts ?? []).filter(contract => contract.type !== 'Safe'),
    ...(defaultSafe ? [defaultSafe] : [])
  ]
}
