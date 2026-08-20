import { isAddress, type Address } from 'viem'
import { getNetwork } from './network'
import hardhat from '@/artifacts/deployed_addresses/chain-31337.json'

// Safe v1.4.1 infrastructure (Singleton, ProxyFactory, CompatibilityFallbackHandler).
// Polygon already has the canonical addresses live (same across every chain that
// uses Safe's standard deterministic deployment) - deploying fresh copies there
// would be wrong. Chain 31337 has none of this pre-deployed, so local Hardhat
// gets its own copies via SafeInfraModule (see contract/ignition/modules).
export interface SafeInfraAddresses {
  singleton: Address
  proxyFactory: Address
  fallbackHandler: Address
}

interface HardhatSafeInfraAddresses {
  'SafeInfraModule#SafeL2'?: string
  'SafeInfraModule#SafeProxyFactory'?: string
  'SafeInfraModule#CompatibilityFallbackHandler'?: string
}

const HARDHAT_SAFE_INFRA = hardhat as HardhatSafeInfraAddresses

const POLYGON_SAFE_INFRA: SafeInfraAddresses = {
  singleton: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762', // SafeL2 v1.4.1 canonical
  proxyFactory: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67', // SafeProxyFactory v1.4.1 canonical
  fallbackHandler: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99' // CompatibilityFallbackHandler v1.4.1 canonical
}

function resolveHardhatSafeAddress(key: keyof HardhatSafeInfraAddresses): Address {
  const address = HARDHAT_SAFE_INFRA[key]

  if (!address || !isAddress(address)) {
    throw new Error(`Safe infra address not defined for "${key}" on chain 31337`)
  }

  return address
}

export function getSafeInfraAddresses(): SafeInfraAddresses {
  const chainId = parseInt(getNetwork().chainId, 16)

  if (chainId === 31337) {
    return {
      singleton: resolveHardhatSafeAddress('SafeInfraModule#SafeL2'),
      proxyFactory: resolveHardhatSafeAddress('SafeInfraModule#SafeProxyFactory'),
      fallbackHandler: resolveHardhatSafeAddress('SafeInfraModule#CompatibilityFallbackHandler')
    }
  }

  if (chainId === 137) return POLYGON_SAFE_INFRA

  throw new Error(`Safe infrastructure not configured for chain ${chainId}`)
}
