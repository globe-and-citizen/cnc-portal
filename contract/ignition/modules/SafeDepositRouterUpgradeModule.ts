import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('SafeDepositRouterUpgradeModulePolygon', (m) => {
  const beaconOwner = m.getAccount(0)

  // Deploy new implementation with unique ID
  const newImpl = m.contract('SafeDepositRouter', [], {
    id: 'SafeDepositRouter_polygon_v4', // Increment version
  })

  // Reference the correct Polygon beacon from chain-137.json
  const beacon = m.contractAt(
    'Beacon',
    '0x872EA629E1e105451A884D52355cc2fDA496Cc23', // Correct beacon address
    { id: 'SafeDepositRouterBeacon_polygon_v4' }
  )

  // Upgrade the beacon to point to new implementation
  m.call(beacon, 'upgradeTo', [newImpl], { from: beaconOwner })

  return { beacon, newImpl }
})
