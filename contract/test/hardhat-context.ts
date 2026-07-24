import hre from 'hardhat'
import { upgrades as createUpgrades } from '@openzeppelin/hardhat-upgrades'
import type { HardhatEthers, HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/types'
import type { NetworkHelpers } from '@nomicfoundation/hardhat-network-helpers/types'

export type SignerWithAddress = HardhatEthersSigner
export type { HardhatEthersSigner }

export let ethers!: HardhatEthers
export let upgrades!: Awaited<ReturnType<typeof createUpgrades>>
export let loadFixture!: NetworkHelpers['loadFixture']
export let time!: NetworkHelpers['time']
export let impersonateAccount!: NetworkHelpers['impersonateAccount']
export let setBalance!: NetworkHelpers['setBalance']

let initialization: Promise<void> | undefined

export function initializeHardhat(): Promise<void> {
  initialization ??= initialize()
  return initialization
}

async function initialize(): Promise<void> {
  const connection = await hre.network.getOrCreate()
  ethers = connection.ethers
  upgrades = await createUpgrades(hre, connection)
  loadFixture = connection.networkHelpers.loadFixture
  time = connection.networkHelpers.time
  impersonateAccount = connection.networkHelpers.impersonateAccount
  setBalance = connection.networkHelpers.setBalance
}
