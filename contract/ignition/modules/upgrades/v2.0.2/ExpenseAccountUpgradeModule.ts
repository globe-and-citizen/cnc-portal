import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import {
  loadDeploymentAddresses,
  requireDeploymentAddress
} from '../../../lib/deployment-addresses.js'

export default buildModule('ExpenseAccountV202UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)
  const canonicalBeacon = requireDeploymentAddress(
    loadDeploymentAddresses(),
    'ExpenseAccountEIP712Module#FactoryBeacon'
  )
  // The guarded production script uses the canonical default. The parameter
  // allows the exact same recipe to be rehearsed against a disposable beacon.
  const beaconAddress = m.getParameter('factoryBeaconAddress', canonicalBeacon)
  const expenseAccountFactoryBeacon = m.contractAt('FactoryBeacon', beaconAddress, {
    id: 'ExpenseAccountFactoryBeacon_v2_0_2'
  })
  const newExpenseAccountImplementation = m.contract('ExpenseAccountEIP712', [], {
    id: 'ExpenseAccountEIP712_v2_0_2'
  })
  m.call(expenseAccountFactoryBeacon, 'upgradeTo', [newExpenseAccountImplementation], {
    from: beaconOwner
  })
  return { newExpenseAccountImplementation, expenseAccountFactoryBeacon }
})
