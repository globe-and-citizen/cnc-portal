import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * @title Vesting Beacon Module
 * @notice Deploys the Vesting implementation and beacon
 * @dev This module creates a beacon that Officer uses to deploy team-specific
 *      Vesting instances via BeaconProxy, identically to SafeDepositRouter.
 *
 * 1. Deploy implementation (uninitialized - will be initialized via proxy)
 * 2. Deploy Beacon (not FactoryBeacon) pointing to implementation
 */
const vestingBeaconModule = buildModule('VestingBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)

  // Deploy the Vesting implementation contract
  // Implementation remains UNINITIALIZED (will be initialized via beacon proxy)
  const vestingImplementation = m.contract('Vesting')

  // Deploy the Beacon pointing to the implementation
  // NOTE: Using 'Beacon', not 'FactoryBeacon' - Officer will create BeaconProxy instances
  const beacon = m.contract('Beacon', [vestingImplementation], {
    from: beaconAdmin
  })

  return {
    beacon,
    implementation: vestingImplementation
  }
})

export default vestingBeaconModule
