import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import {
  loadDeploymentAddresses,
  requireDeploymentAddress
} from '../lib/deployment-addresses.js'

export default buildModule('OfficerV201UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)
  const deployedAddresses = loadDeploymentAddresses()
  const factoryBeaconAddress = requireDeploymentAddress(
    deployedAddresses,
    'Officer#FactoryBeacon'
  )
  const feeCollectorAddress = requireDeploymentAddress(
    deployedAddresses,
    'FeeCollectorModule#FeeCollector'
  )
  const factoryBeacon = m.contractAt('FactoryBeacon', factoryBeaconAddress, {
    id: 'OfficerFactoryBeacon_v2_0_1'
  })
  const newOfficerImplementation = m.contract('Officer', [feeCollectorAddress], {
    id: 'Officer_v2_0_1'
  })

  m.call(factoryBeacon, 'upgradeTo', [newOfficerImplementation], { from: beaconOwner })

  return { factoryBeacon, newOfficerImplementation }
})
