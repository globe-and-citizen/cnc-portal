import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * @title SafeDepositRouter Beacon Module
 * @notice Deploys the SafeDepositRouter implementation and beacon
 * @dev This module creates a beacon that can be used by Officer to deploy
 *      team-specific SafeDepositRouter instances via BeaconProxy
 */
export default buildModule('SafeDepositRouterBeaconModule', (m) => {
  // Get the deployer account
  const deployer = m.getAccount(0)

  // Deploy the SafeDepositRouter implementation contract
  const safeDepositRouterImpl = m.contract('SafeDepositRouter', [], {
    id: 'SafeDepositRouter_Implementation'
  })

  // Deploy the UpgradeableBeacon pointing to the implementation
  // The deployer will be the beacon owner (can upgrade implementation)
  const beacon = m.contract(
    'UpgradeableBeacon',
    [safeDepositRouterImpl, deployer],
    {
      id: 'SafeDepositRouter_Beacon'
    }
  )

  return {
    implementation: safeDepositRouterImpl,
    beacon
  }
})