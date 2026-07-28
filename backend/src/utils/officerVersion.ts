import { Address, getAddress, isAddressEqual, zeroAddress } from 'viem';
import OFFICER_ABI from '../artifacts/officer_abi.json';
import registry from '../artifacts/version-registry.json';
import addressesV0 from '../artifacts/deployed_addresses/V0/chain-137.json';
import addressesV01 from '../artifacts/deployed_addresses/V0.1/chain-137.json';
import addressesV1 from '../artifacts/deployed_addresses/V1/chain-137.json';
import addressesV2 from '../artifacts/deployed_addresses/V2/chain-137.json';
import publicClient from './viem.config';

// Active Officer generation per network, named by registry folder. Hardhat can
// validate a new generation before Polygon adopts it, so the mapping stays
// per-chain even while both point at the same folder. Polygon is on V2 since
// that rollout (Officer#FactoryBeacon 0xF4265dC2236012C2Fd5bC771D0f6c3f30D210FFc,
// see contract/versions/README.md).
export const ACTIVE_OFFICER_FOLDER_BY_CHAIN: Record<number, string> = {
  137: 'V2',
  31337: 'V2',
};

export const getActiveOfficerFolder = (chainId: number = publicClient.chain?.id ?? 137) =>
  ACTIVE_OFFICER_FOLDER_BY_CHAIN[chainId];

// ERC-1967 beacon slot: bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1).
// A team's Officer is a beacon proxy; this slot holds the FactoryBeacon that
// deployed it, which the registry maps back to a generation.
const BEACON_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

// Per-chain address snapshots, keyed by version folder. Only Polygon is frozen
// today (contract/versions/<V>/deployed_addresses/chain-137.json); other chains
// simply have no entry, so their Officers fall back to the on-chain `version()`.
const ADDRESSES_BY_CHAIN: Record<number, Record<string, Record<string, string>>> = {
  137: {
    V0: addressesV0,
    'V0.1': addressesV01,
    V1: addressesV1,
    V2: addressesV2,
  },
};

type RegistryFolder = {
  onchainVersionMin: string;
  onchainVersionMax: string;
  beacons: Record<string, string>;
};

const folders = registry.folders as Record<string, RegistryFolder>;

/**
 * The semver a generation's Officers report. Generations predating the on-chain
 * `version()` getter have no way to state it themselves, so the registry's floor
 * (`onchainVersionMin`: V0 -> 0.0.0, V0.1 -> 0.1.0, V1 -> 1.0.0) is the tag they
 * are recorded under.
 */
export const semverForVersionFolder = (folder: string): string | undefined =>
  folders[folder]?.onchainVersionMin;

/** The floor of the active generation on a network, e.g. '2.0.0' on Polygon. */
export const getActiveOfficerVersion = (chainId?: number): string | undefined =>
  semverForVersionFolder(getActiveOfficerFolder(chainId));

// Lenient on purpose: a stored tag is only ever compared, never rendered from
// here. Non-numeric tags ('legacy', 'v0.10', 'unknown') and pre-release suffixes
// return null and are simply treated as "not the active generation".
const parseSemver = (value?: string | null): [number, number, number] | null => {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length === 0 || parts.length > 3) return null;

  const numbers = parts.map(Number);
  if (numbers.some((n) => !Number.isInteger(n) || n < 0)) return null;

  return [numbers[0], numbers[1] ?? 0, numbers[2] ?? 0];
};

const compareSemver = (a: [number, number, number], b: [number, number, number]) =>
  a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/**
 * True when a stored Officer version falls inside the active generation's
 * on-chain range (`onchainVersionMin`..`onchainVersionMax` in the registry).
 *
 * A range rather than an equality check: a generation ships point releases, so
 * an Officer reporting '2.1.0' is still V2 and its team is still migrated. An
 * `=== '2.0.0'` comparison would report every one of those teams as stale.
 */
export const isActiveOfficerVersion = (version?: string | null, chainId?: number): boolean => {
  const config = folders[getActiveOfficerFolder(chainId)];
  if (!config) return false;

  const current = parseSemver(version);
  const min = parseSemver(config.onchainVersionMin);
  const max = parseSemver(config.onchainVersionMax);
  if (!current || !min || !max) return false;

  return compareSemver(current, min) >= 0 && compareSemver(current, max) <= 0;
};

// chainId -> (lowercased Officer FactoryBeacon -> semver). Each generation
// deployed its own FactoryBeacon, so the beacon address behind a team's Officer
// proxy identifies the generation exactly.
const BEACON_TO_SEMVER_BY_CHAIN: Record<number, Record<string, string>> = {};
for (const [chainId, addressesByFolder] of Object.entries(ADDRESSES_BY_CHAIN)) {
  const map: Record<string, string> = {};
  for (const [folder, config] of Object.entries(folders)) {
    const beacon = addressesByFolder[folder]?.[config.beacons.Officer];
    if (beacon) map[beacon.toLowerCase()] = config.onchainVersionMin;
  }
  BEACON_TO_SEMVER_BY_CHAIN[Number(chainId)] = map;
}

/**
 * Resolve the generation a FactoryBeacon belongs to, as a semver. Returns
 * undefined when the beacon isn't a known generation on that chain.
 */
export const semverForOfficerBeacon = (
  beacon: string | null | undefined,
  chainId: number = publicClient.chain?.id ?? 137
): string | undefined =>
  beacon ? BEACON_TO_SEMVER_BY_CHAIN[chainId]?.[beacon.toLowerCase()] : undefined;

// How a resolved version was obtained: the Officer told us (`onchain`), or we
// matched the FactoryBeacon behind its proxy against the registry (`beacon`).
export type OfficerVersionSource = 'onchain' | 'beacon';

export interface ResolvedOfficerVersion {
  version: string | null;
  source: OfficerVersionSource | null;
}

/** Read the FactoryBeacon address out of an Officer proxy's ERC-1967 slot. */
const readOfficerBeacon = async (officerAddress: Address): Promise<Address | null> => {
  const raw = await publicClient.getStorageAt({ address: officerAddress, slot: BEACON_SLOT });
  if (!raw) return null;
  // The storage word is left-padded; the address is the low 20 bytes.
  const beacon = getAddress(`0x${raw.slice(-40)}`);
  return isAddressEqual(beacon, zeroAddress) ? null : beacon;
};

/**
 * Detect which contract generation an Officer belongs to, as a semver string.
 *
 * 1. `version()` — V2+ Officers state it themselves; that answer always wins.
 * 2. Otherwise the ERC-1967 beacon slot, matched against the frozen per-version
 *    address snapshots (contract/versions/<V>/deployed_addresses).
 * 3. Otherwise `{ version: null }` — unresolved. Callers must not guess: leaving
 *    a stored version alone is safer than overwriting it with a default.
 *
 * The dashboard's simulation (dashboard/app/composables/useOfficerVersionAudit.ts)
 * mirrors these steps, so a preview and the write it triggers agree.
 */
export const resolveOfficerVersion = async (
  officerAddress: Address
): Promise<ResolvedOfficerVersion> => {
  try {
    const version = (await publicClient.readContract({
      address: officerAddress,
      abi: OFFICER_ABI,
      functionName: 'version',
    })) as string;
    if (typeof version === 'string' && version.length > 0) {
      return { version, source: 'onchain' };
    }
  } catch {
    // Generations before V2 do not expose version().
  }

  try {
    const beacon = await readOfficerBeacon(officerAddress);
    const version = semverForOfficerBeacon(beacon);
    if (version) return { version, source: 'beacon' };
  } catch {
    // Unreachable RPC or a non-proxy address — reported as unresolved below.
  }

  return { version: null, source: null };
};
