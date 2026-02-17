import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

/**
 * @title SafeDepositRouter Upgrade Module
 * @notice Upgrades the SafeDepositRouter implementation
 * @dev This upgrades ALL team SafeDepositRouter instances via the beacon
 */
export default buildModule('SafeDepositRouterUpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)

  // Step 1: Deploy new SafeDepositRouter implementation
  const newImpl = m.contract('SafeDepositRouter', [], {
    id: 'SafeDepositRouter_v2' // Use unique ID for this upgrade
  })


  // Step 2: Reference the already-deployed FactoryBeacon
  // Update this address after initial deployment to the correct network
  const factoryBeacon = m.contractAt(
    'FactoryBeacon',
    '0x0000000000000000000000000000000000000000', // TODO: Replace with actual SafeDepositRouter beacon address from deployment
    { id: 'SafeDepositRouterBeacon_existing' }
  )

  // Step 3: Upgrade the beacon to point to new implementation
  m.call(factoryBeacon, 'upgradeTo', [newImpl], { from: beaconOwner })

  return { 
    factoryBeacon, 
    newImpl 
  }
})