import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('InvestorsV1UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)

  // Step 1: Deploy new implementation with a unique ID - NB: Use a unique ID for each deployment
  const newImpl = m.contract('InvestorV1', [], {
    id: 'InvestorV1_v2' //e.g. 'BoardOfDirectors_v1
  })

  // Alternatively, if you need to revert to an existing implementation
  // Step 1: Reference an existing implementation - NB: Use correct implementation address for
  // the network and a unique ID for each deployment
  // const newImpl = m.contractAt('CashRemunerationEIP712', '<existing_implementation_address>', { id: '<unique_implementation_id>' })

  // Step 2: Reference the already-deployed beacon - NB: Use correct beacon address for the network and add a unique ID
  const beacon = m.contractAt('Beacon', '0x7edC7a6e851ba4938aC0AFBF6811B9Ed01222897', { id: 'Beacon_v2' }) //e.g. 'Beacon_v1'

  // Call upgradeTo on the beacon
  m.call(beacon, 'upgradeTo', [newImpl], { from: beaconOwner })

  return { beacon, newImpl }
})
