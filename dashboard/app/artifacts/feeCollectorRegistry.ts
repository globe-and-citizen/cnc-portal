import { zeroAddress, type Abi, type Address } from 'viem'
import registry from './version-registry.json'
import feeCollectorV0 from './abi/V0/json/FeeCollector.json'
import feeCollectorV0_1 from './abi/V0.1/json/FeeCollector.json'
import feeCollectorV1 from './abi/V1/json/FeeCollector.json'
import addressesV0 from './deployed_addresses/V0/chain-137.json'
import addressesV0_1 from './deployed_addresses/V0.1/chain-137.json'
import addressesV1 from './deployed_addresses/V1/chain-137.json'

/**
 * Version-aware resolution of the FeeCollector (Micropayment) contract.
 *
 * The version registry (`version-registry.json`) is the source of truth for the
 * set of deployed protocol versions. For each version it stores an Ignition
 * *module key* (e.g. `FeeCollectorModule#FeeCollector`) rather than a raw
 * address; the concrete address lives in that version's own
 * `deployed_addresses/<version>/chain-137.json`.
 *
 * Versioned deployments only exist on Polygon (chain 137) — these are the
 * historical live protocol deploys — so resolution here is Polygon-scoped.
 * The ABI is loaded per version because it diverges across versions (V1 adds
 * beneficiary/payFee/getSupportedTokens etc. that V0/V0.1 lack); handling the
 * per-function retro-compatibility is done by the consuming composables.
 */
export type FeeCollectorVersion = keyof typeof registry.folders

export const FEE_COLLECTOR_VERSIONS = Object.keys(registry.folders) as FeeCollectorVersion[]
export const CURRENT_FEE_COLLECTOR_VERSION = registry.current as FeeCollectorVersion

const ABIS: Record<FeeCollectorVersion, Abi> = {
  'V0': feeCollectorV0 as Abi,
  'V0.1': feeCollectorV0_1 as Abi,
  'V1': feeCollectorV1 as Abi
}

const ADDRESSES: Record<FeeCollectorVersion, Record<string, string>> = {
  'V0': addressesV0,
  'V0.1': addressesV0_1,
  'V1': addressesV1
}

export interface FeeCollectorContract {
  version: FeeCollectorVersion
  address: Address
  abi: Abi
}

export function resolveFeeCollector(version: FeeCollectorVersion): FeeCollectorContract {
  const moduleKey = registry.folders[version]?.implementations?.FeeCollector
  const address = moduleKey ? ADDRESSES[version]?.[moduleKey] : undefined

  return {
    version,
    address: (address ?? zeroAddress) as Address,
    abi: ABIS[version]
  }
}
