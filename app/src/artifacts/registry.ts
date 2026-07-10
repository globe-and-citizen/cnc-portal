import type { Abi } from 'viem'
import type { ContractType } from '@/types'
import registryJson from './version-registry.json'
import * as currentAbis from './abi'
import * as v1Abis from './abi/v1'

/**
 * Version-aware ABI resolver.
 *
 * The contract artifacts are versioned in snapshot folders (see
 * contract/versions/registry.json and scripts/freeze-version.ts): the current
 * set lives at the top level, older sets are frozen under `abi/<version>/`.
 * `version-registry.json` maps a team's Officer-generation tag to a folder.
 *
 * Today `current === 'v1'` and there is only one folder, so every lookup
 * resolves to the current ABIs — this is a no-op until a second version ships.
 */

export type FolderVersion = keyof typeof registryJson.folders & string

type AbiMap = Partial<Record<ContractType, Abi>>

// ContractType -> the wrapper export name shared by every version's barrel.
// Only per-team / versioned contract types need an entry; anything absent
// falls back to the current ABI. `Safe` is an external Gnosis Safe (no wrapper).
const ABI_EXPORT: Partial<Record<ContractType, string>> = {
  Bank: 'BANK_ABI',
  BoardOfDirectors: 'BOARD_OF_DIRECTORS_ABI',
  CashRemunerationEIP712: 'CASH_REMUNERATION_EIP712_ABI',
  Campaign: 'AD_CAMPAIGN_MANAGER_ABI',
  Elections: 'ELECTIONS_ABI',
  ExpenseAccountEIP712: 'EXPENSE_ACCOUNT_EIP712_ABI',
  FixedReturn: 'FIXED_RETURN_ABI',
  InvestorV1: 'INVESTOR_ABI',
  Proposals: 'PROPOSALS_ABI',
  SafeDepositRouter: 'SAFE_DEPOSIT_ROUTER_ABI',
  Vesting: 'VESTING_ABI',
  Voting: 'VOTING_ABI'
}

function buildAbiMap(barrel: Record<string, Abi>): AbiMap {
  const map: AbiMap = {}
  for (const [type, exportName] of Object.entries(ABI_EXPORT)) {
    const abi = barrel[exportName]
    if (abi) map[type as ContractType] = abi
  }
  return map
}

// Barrels export each ABI as `X_ABI: Abi`, so a namespace is a string->Abi bag.
const CURRENT_ABIS = buildAbiMap(currentAbis as unknown as Record<string, Abi>)
const FROZEN_ABIS: Partial<Record<FolderVersion, AbiMap>> = {
  v1: buildAbiMap(v1Abis as unknown as Record<string, Abi>)
}

const CURRENT_FOLDER = registryJson.current as FolderVersion

/** Ordered list of folders, oldest first (v1, v2, …). */
const FOLDERS = Object.keys(registryJson.folders).sort(
  (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))
) as FolderVersion[]

/**
 * Resolve which artifact-folder version a team runs from its Officer-generation
 * tag (`TeamOfficer.version`, e.g. 'legacy' / 'v0.10'). Falls back to the
 * OLDEST folder when the tag is missing or unknown — the safe default for
 * backward compatibility (never assume a team is on the newest version).
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

/**
 * Get the ABI for a contract type as deployed for a given folder version.
 * The current folder always reads the top-level (live) ABIs; older folders
 * read their frozen snapshot, falling back to current for types that didn't
 * exist when the snapshot was cut.
 */
export function getAbi(type: ContractType, folder: FolderVersion): Abi {
  const map = folder === CURRENT_FOLDER ? CURRENT_ABIS : (FROZEN_ABIS[folder] ?? CURRENT_ABIS)
  const abi = map[type] ?? CURRENT_ABIS[type]
  if (!abi) {
    throw new Error(`No ABI registered for contract type "${type}" (folder "${folder}")`)
  }
  return abi
}
