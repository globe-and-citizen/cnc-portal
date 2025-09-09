// modules/CashRemunerationEIP712UpgradeModule.ts
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('CashRemunerationEIP712UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)

  // Step 1: Deploy new implementation with a unique ID - NB: Use a unique ID for each deployment
  const newImpl = m.contract('CashRemunerationEIP712', [], {
    id: '<unique_implementation_id>' //e.g. 'CashRemunerationEIP712_v1
  })

  // Alternatively, if you need to revert to an existing implementation
  // Step 1: Reference an existing implementation - NB: Use correct implementation address for
  // the network and a unique ID for each deployment
  // const newImpl = m.contractAt('CashRemunerationEIP712', '<existing_implementation_address>', { id: '<unique_implementation_id>' })

  // Step 2: Reference the already-deployed beacon - NB: Use correct beacon address for the network and add a unique ID
  const factoryBeacon = m.contractAt('FactoryBeacon', '<network_beacon_address>', { id: '<unique_beacon_id>' }) //e.g. 'FactoryBeacon_v1'

  // Call upgradeTo on the beacon
  m.call(factoryBeacon, 'upgradeTo', [newImpl], { from: beaconOwner })

  return { factoryBeacon, newImpl }
})
