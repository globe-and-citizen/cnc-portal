import registryJson from './version-registry.json'
import addrV0 from './deployed_addresses/V0/chain-137.json'
import addrV01 from './deployed_addresses/V0.1/chain-137.json'
import addrV1 from './deployed_addresses/V1/chain-137.json'

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

// Per-version module-name → address maps (Polygon). Add a folder's import here
// when a new generation (e.g. V2) is snapshotted.
const ADDRESSES: Partial<Record<FolderVersion, Record<string, string>>> = {
  ['V0' as FolderVersion]: addrV0,
  ['V0.1' as FolderVersion]: addrV01,
  ['V1' as FolderVersion]: addrV1
}

// Each generation's Officer FactoryBeacon resolves to a distinct address; this
// maps a team's on-chain Officer beacon back to its artifact folder. This is the
// concrete identifier the registry says a team maps to (the `officerVersions`
// tags aren't wired). Until the backend backfills `Team.contractVersion`, the
// frontend resolves the folder from this map (see useContractVersion).
const OFFICER_BEACON_TO_FOLDER: Record<string, FolderVersion> = {}
for (const folder of FOLDERS) {
  const ref = (registryJson.folders[folder] as { beacons: Record<string, string> }).beacons.Officer
  const address = ref ? ADDRESSES[folder]?.[ref] : undefined
  if (address) OFFICER_BEACON_TO_FOLDER[address.toLowerCase()] = folder
}

/**
 * Resolve the artifact folder a team runs from its on-chain Officer FactoryBeacon
 * address. Returns undefined if the beacon isn't a known generation.
 */
export function folderForOfficerBeacon(beacon?: string | null): FolderVersion | undefined {
  return beacon ? OFFICER_BEACON_TO_FOLDER[beacon.toLowerCase()] : undefined
}
