import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import {
  loadDeploymentAddresses,
  requireDeploymentAddress
} from '../../../lib/deployment-addresses.js'

export default buildModule('ExpenseAccountV201UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)
  const deployedAddresses = loadDeploymentAddresses()
  const factoryBeaconAddress = requireDeploymentAddress(
    deployedAddresses,
    'ExpenseAccountEIP712Module#FactoryBeacon'
  )
  const expenseAccountFactoryBeacon = m.contractAt('FactoryBeacon', factoryBeaconAddress, {
    id: 'ExpenseAccountFactoryBeacon_v2_0_1'
  })
  const newExpenseAccountImplementation = m.contract('ExpenseAccountEIP712', [], {
    id: 'ExpenseAccountEIP712_v2_0_1'
  })

  m.call(expenseAccountFactoryBeacon, 'upgradeTo', [newExpenseAccountImplementation], {
    from: beaconOwner
  })

  return { newExpenseAccountImplementation, expenseAccountFactoryBeacon }
})
