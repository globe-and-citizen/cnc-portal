import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * @title SafeDepositRouter Beacon Module
 * @notice Deploys the SafeDepositRouter implementation and beacon
 * @dev This module creates a beacon that can be used by Officer to deploy
 *      team-specific SafeDepositRouter instances via BeaconProxy
 *
 * 1. Deploy implementation (uninitialized - will be initialized via proxy)
 * 2. Deploy Beacon (not FactoryBeacon) pointing to implementation
 */
const safeDepositRouterBeaconModule = buildModule('SafeDepositRouterBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)

  // Deploy the SafeDepositRouter implementation contract
  // Implementation remains UNINITIALIZED (will be initialized via beacon proxy)
  const safeDepositRouterImplementation = m.contract('SafeDepositRouter')

  // Deploy the Beacon pointing to the implementation
  // NOTE: Using 'Beacon', not 'FactoryBeacon' - Officer will create BeaconProxy instances
  const beacon = m.contract('Beacon', [safeDepositRouterImplementation], {
    from: beaconAdmin,
  })

  return {
    beacon,
    implementation: safeDepositRouterImplementation,
  }
})

export default safeDepositRouterBeaconModule