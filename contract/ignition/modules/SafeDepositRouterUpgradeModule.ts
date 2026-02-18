import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('SafeDepositRouterUpgradeModulePolygon', (m) => { // ← new module name
  const beaconOwner = m.getAccount(0)

  const newImpl = m.contract('SafeDepositRouter', [], {
    id: 'SafeDepositRouter_polygon_v3', // ← new unique ID
  })

  // Polygon beacon
  const beacon = m.contractAt(
    'Beacon',
    '0xd92D080C25020a1dB173FDE24337deAd92F22579',
    { id: 'SafeDepositRouterBeacon_polygon_v3' } // ← new unique ID
  )

  m.call(beacon, 'upgradeTo', [newImpl], { from: beaconOwner })

  return { beacon, newImpl }
})