import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('BodUpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)

  // Step 1: Deploy new implementation with a unique ID - NB: Use a unique ID for each deployment
  const newImpl = m.contract('BoardOfDirectors', [], {
    id: '<unique_implementation_id>' //e.g. 'BoardOfDirectors_v1
  })

  // Alternatively, if you need to revert to an existing implementation
  // Step 1: Reference an existing implementation - NB: Use correct implementation address for
  // the network and a unique ID for each deployment
  // const newImpl = m.contractAt('CashRemunerationEIP712', '<existing_implementation_address>', { id: '<unique_implementation_id>' })

  // Step 2: Reference the already-deployed beacon - NB: Use correct beacon address for the network and add a unique ID
  const beacon = m.contractAt('Beacon', ',<beacon_address>', { id: '<unique_beacon_id>' }) //e.g. 'Beacon_v1'

  // Call upgradeTo on the beacon
  m.call(beacon, 'upgradeTo', [newImpl], { from: beaconOwner })

  return { beacon, newImpl }
})
