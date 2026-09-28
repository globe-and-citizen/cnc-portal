import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import {
  loadDeploymentAddresses,
  requireDeploymentAddress
} from '../../../lib/deployment-addresses.js'

export default buildModule('CashRemunerationV201UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)
  const deployedAddresses = loadDeploymentAddresses()
  const factoryBeaconAddress = requireDeploymentAddress(
    deployedAddresses,
    'CashRemunerationEIP712Module#FactoryBeacon'
  )
  const cashRemunerationFactoryBeacon = m.contractAt('FactoryBeacon', factoryBeaconAddress, {
    id: 'CashRemunerationFactoryBeacon_v2_0_1'
  })
  const newCashRemunerationImplementation = m.contract('CashRemunerationEIP712', [], {
    id: 'CashRemunerationEIP712_v2_0_1'
  })

  m.call(cashRemunerationFactoryBeacon, 'upgradeTo', [newCashRemunerationImplementation], {
    from: beaconOwner
  })

  return { newCashRemunerationImplementation, cashRemunerationFactoryBeacon }
})
