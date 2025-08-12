// modules/CashRemunerationEIP712UpgradeModule.ts
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('CashRemunerationEIP712UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)

  // Step 1: Deploy new implementation with a unique ID
  const newImpl = m.contract('CashRemunerationEIP712', [], {
    id: 'CashRemunerationEIP712_v1'
  })

  // Step 2: Reference the already-deployed beacon but create a new ID
  const factoryBeacon = m.contractAt('FactoryBeacon', '0x9A676e781A523b5d0C0e43731313A708CB607508', { id: 'FactoryBeacon_v1' })

  // Call upgradeTo on the beacon
  m.call(factoryBeacon, 'upgradeTo', [newImpl], { from: beaconOwner })

  return { factoryBeacon, newImpl }
})
