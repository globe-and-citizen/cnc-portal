import { getAddress, isAddress } from 'ethers'
import fs from 'node:fs'
import path from 'node:path'

export const POLYGON_UPGRADE_CHAIN_ID = 137 as const

export type SupportedUpgradeChainId = typeof POLYGON_UPGRADE_CHAIN_ID
export type DeploymentAddresses = Record<string, string>

export function getUpgradeChainId(): SupportedUpgradeChainId {
  const rawChainId = process.env.CNC_UPGRADE_CHAIN_ID
  const chainId = Number(rawChainId)

  if (chainId !== POLYGON_UPGRADE_CHAIN_ID) {
    throw new Error('CNC_UPGRADE_CHAIN_ID must be set to 137 (Polygon)')
  }

  return chainId as SupportedUpgradeChainId
}

export function loadDeploymentAddresses(
  chainId: SupportedUpgradeChainId = getUpgradeChainId()
): DeploymentAddresses {
  const deployedAddressesPath = path.join(
    import.meta.dirname,
    `../deployments/chain-${chainId}/deployed_addresses.json`
  )

  if (!fs.existsSync(deployedAddressesPath)) {
    throw new Error(`No canonical deployment registry found for chain ${chainId}`)
  }

  return JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8')) as DeploymentAddresses
}

export function requireDeploymentAddress(
  deployedAddresses: DeploymentAddresses,
  key: string
): string {
  const address = deployedAddresses[key]

  if (!address || !isAddress(address)) {
    throw new Error(`Missing or invalid deployment address for ${key}`)
  }

  return getAddress(address)
}
