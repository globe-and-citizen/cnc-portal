import { computed } from 'vue'
import type { Address } from 'viem'
import registry from '~/artifacts/version-registry.json'
import addrV0 from '~/artifacts/deployed_addresses/V0/chain-137.json'
import addrV01 from '~/artifacts/deployed_addresses/V0.1/chain-137.json'
import addrV1 from '~/artifacts/deployed_addresses/V1/chain-137.json'

// Per-version module-name → address maps (Polygon). Keyed by version folder so
// the registry's module references (e.g. "BankBeaconModule#Beacon") resolve to
// the concrete address of *that* generation.
const ADDRESSES: Record<string, Record<string, string>> = {
  'V0': addrV0,
  'V0.1': addrV01,
  'V1': addrV1
}

type Folder = {
  officer: string
  commit: string
  deployedAt: string
  onchainVersionMin: string
  onchainVersionMax: string
  beacons: Record<string, string>
  implementations: Record<string, string>
}

const folders = registry.folders as Record<string, Folder>
const currentVersion = registry.current as string

// Each generation's Officer FactoryBeacon resolves to a distinct address; this
// lets us map a team's on-chain Officer beacon back to its registry version
// (V0 / V0.1 / V1) — the concrete identifier the registry says a team maps to.
const OFFICER_BEACON_TO_VERSION: Record<string, string> = {}
for (const [version, folder] of Object.entries(folders)) {
  const ref = folder.beacons.Officer
  const address = ref ? ADDRESSES[version]?.[ref] : undefined
  if (address) OFFICER_BEACON_TO_VERSION[address.toLowerCase()] = version
}

/**
 * Resolve the registry version (V0 / V0.1 / V1) an Officer belongs to from its
 * on-chain FactoryBeacon address. Returns null if the beacon isn't a known
 * generation.
 */
export const registryVersionForOfficerBeacon = (
  beacon: string | null | undefined
): string | null => (beacon ? (OFFICER_BEACON_TO_VERSION[beacon.toLowerCase()] ?? null) : null)

// Stable display order: Officer first, then the beacon-backed sub-contracts, then
// the transparent-proxy contracts (no beacon). Any unlisted contract is appended.
const CONTRACT_ORDER = [
  'Officer',
  'Bank',
  'BoardOfDirectors',
  'Proposals',
  'Elections',
  'InvestorV1',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'SafeDepositRouter',
  'Vesting',
  'FeeCollector'
]

export interface VersionMeta {
  version: string
  officer: Address
  commit: string
  deployedAt: string
  onchainVersionMin: string
  onchainVersionMax: string
  isCurrent: boolean
}

export interface ContractDeployment {
  version: string
  deployedAt: string
  isCurrent: boolean
  beaconRef: string | null
  beacon: Address | null
  implRef: string | null
  implementation: Address | null
}

export interface ContractHistory {
  name: string
  hasBeacon: boolean
  deployments: ContractDeployment[]
}

const resolve = (version: string, ref: string | undefined): Address | null => {
  if (!ref) return null
  const address = ADDRESSES[version]?.[ref]
  return (address as Address) ?? null
}

/**
 * Reads the versioned contract registry (V0 → V0.1 → V1) and exposes it two
 * ways: the generation metadata list, and a per-contract upgrade history with
 * the resolved Beacon + implementation address for each generation.
 */
export const useContractRegistry = () => {
  const versionKeys = Object.keys(folders)

  const versions = computed<VersionMeta[]>(() =>
    versionKeys.map(version => ({
      version,
      officer: folders[version]!.officer as Address,
      commit: folders[version]!.commit,
      deployedAt: folders[version]!.deployedAt,
      onchainVersionMin: folders[version]!.onchainVersionMin,
      onchainVersionMax: folders[version]!.onchainVersionMax,
      isCurrent: version === currentVersion
    }))
  )

  const contracts = computed<ContractHistory[]>(() => {
    // Union of every contract that appears in any generation's implementations.
    const names = new Set<string>()
    for (const f of Object.values(folders)) {
      Object.keys(f.implementations).forEach(n => names.add(n))
    }
    const ordered = [
      ...CONTRACT_ORDER.filter(n => names.has(n)),
      ...[...names].filter(n => !CONTRACT_ORDER.includes(n)).sort()
    ]

    return ordered.map((name) => {
      const deployments: ContractDeployment[] = versionKeys
        .filter(version => folders[version]!.implementations[name])
        .map((version) => {
          const f = folders[version]!
          const beaconRef = f.beacons[name] ?? null
          const implRef = f.implementations[name] ?? null
          return {
            version,
            deployedAt: f.deployedAt,
            isCurrent: version === currentVersion,
            beaconRef,
            beacon: resolve(version, beaconRef ?? undefined),
            implRef,
            implementation: resolve(version, implRef ?? undefined)
          }
        })

      return {
        name,
        hasBeacon: deployments.some(d => d.beacon),
        deployments
      }
    })
  })

  return { versions, contracts, currentVersion }
}
