import registryJson from './version-registry.json'

/**
 * Contract-version signal (no magic ABI resolution).
 *
 * Artifacts are versioned in snapshot folders (see contract/versions/registry.json
 * and scripts/freeze-version.ts): the current set lives at the top level, older
 * sets are frozen under `abi/<version>/`. `version-registry.json` maps a team's
 * Officer-generation tag to a folder.
 *
 * This module only tells you WHICH version a team runs (`resolveFolder`). Picking
 * the ABI / call flow stays EXPLICIT at the call site: for a function that differs
 * across versions, write an explicit `useXxxV2` composable that imports the pinned
 * version ABI (e.g. `@/artifacts/abi/v1/bank`), and branch on `useContractVersion()`.
 * Functions whose signature is unchanged across versions need no versioning — their
 * single composable keeps using the current ABI. See composables/contracts/README.md.
 */

export type FolderVersion = keyof typeof registryJson.folders & string

// Folders oldest-first (v1, v2, …).
const FOLDERS = Object.keys(registryJson.folders).sort(
  (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))
) as FolderVersion[]

const CURRENT_FOLDER = registryJson.current as FolderVersion

/** The artifact-folder version the top-level (live) artifacts represent. */
export const CURRENT_VERSION: FolderVersion = CURRENT_FOLDER

/**
 * Resolve which artifact-folder version a team runs from its Officer-generation
 * tag (`TeamOfficer.version`, e.g. 'legacy' / 'v0.10'). Falls back to the OLDEST
 * folder when the tag is missing or unknown — the safe default for backward
 * compatibility (never assume a team is on the newest version).
 */
export function resolveFolder(officerTag?: string | null): FolderVersion {
  if (officerTag) {
    for (const folder of FOLDERS) {
      const cfg = registryJson.folders[folder] as { officerVersions: string[] }
      if (cfg.officerVersions.includes(officerTag)) return folder
    }
  }
  return FOLDERS[0] ?? CURRENT_FOLDER
}

// Per-(folder, chain) module-name → address maps, discovered from the bundled
// snapshots. Only chains/versions actually deployed have a `deployed_addresses/
// <folder>/chain-<id>.json`, so a network missing a version simply has no entry
// (teams there resolve to CURRENT). The top-level `deployed_addresses/chain-*.json`
// (no folder segment) is intentionally NOT matched.
const addressSnapshots = import.meta.glob<Record<string, string>>(
  './deployed_addresses/*/chain-*.json',
  { eager: true, import: 'default' }
)

const currentAddressSnapshots = import.meta.glob<Record<string, string>>(
  './deployed_addresses/chain-*.json',
  { eager: true, import: 'default' }
)

/**
 * Resolve the latest contract generation deployed on a chain by matching its
 * active Officer beacon against the versioned deployment snapshots. Networks
 * without a matching frozen snapshot use the registry's current generation.
 */
export function latestDeployedVersionForChain(chainId: number): string {
  const currentPath = `./deployed_addresses/chain-${chainId}.json`
  const currentOfficerBeacon = currentAddressSnapshots[currentPath]?.['Officer#FactoryBeacon']

  if (!currentOfficerBeacon) return CURRENT_VERSION

  for (const [path, addresses] of Object.entries(addressSnapshots)) {
    const match = path.match(/\/deployed_addresses\/([^/]+)\/chain-(\d+)\.json$/)
    const version = match?.[1]
    if (!version || Number(match[2]) !== chainId) continue

    const snapshotOfficerBeacon = addresses['Officer#FactoryBeacon']
    if (snapshotOfficerBeacon?.toLowerCase() === currentOfficerBeacon.toLowerCase()) {
      return version
    }
  }

  return CURRENT_VERSION
}

// chainId → (lowercased Officer FactoryBeacon address → folder). Each generation's
// Officer beacon is a distinct address per chain, so this maps a team's on-chain
// Officer beacon back to its artifact folder. It's the concrete identifier the
// registry says a team maps to (the `officerVersions` tags aren't wired). Until
// the backend backfills `Team.contractVersion`, the frontend resolves from this
// map (see useOfficerBeaconFolder).
const OFFICER_BEACON_TO_FOLDER: Record<number, Record<string, FolderVersion>> = {}
for (const [path, addresses] of Object.entries(addressSnapshots)) {
  const match = path.match(/\/deployed_addresses\/([^/]+)\/chain-(\d+)\.json$/)
  if (!match) continue
  const folder = match[1] as FolderVersion
  const chainId = Number(match[2])
  const cfg = registryJson.folders[folder] as { beacons?: Record<string, string> } | undefined
  const ref = cfg?.beacons?.Officer // skips folders not in the registry
  const beacon = ref ? addresses[ref] : undefined
  if (!beacon) continue
  ;(OFFICER_BEACON_TO_FOLDER[chainId] ??= {})[beacon.toLowerCase()] = folder
}

/**
 * Resolve the artifact folder a team runs from its on-chain Officer FactoryBeacon
 * address, scoped to the chain. Returns undefined when the beacon isn't a known
 * generation on that chain (e.g. a network where only the current version is
 * deployed) — the caller then defaults to CURRENT_VERSION.
 */
export function folderForOfficerBeacon(
  beacon?: string | null,
  chainId?: number
): FolderVersion | undefined {
  if (!beacon || chainId == null) return undefined
  return OFFICER_BEACON_TO_FOLDER[chainId]?.[beacon.toLowerCase()]
}
