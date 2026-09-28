import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import {
  loadDeploymentAddresses,
  requireDeploymentAddress
} from '../../../lib/deployment-addresses.js'

export default buildModule('InvestorV201UpgradeModule', (m) => {
  const beaconOwner = m.getAccount(0)
  const deployedAddresses = loadDeploymentAddresses()
  const beaconAddress = requireDeploymentAddress(
    deployedAddresses,
    'InvestorBeaconModule#Beacon'
  )
  const investorBeacon = m.contractAt('Beacon', beaconAddress, {
    id: 'InvestorBeacon_v2_0_1'
  })
  const newInvestorImplementation = m.contract('Investor', [], {
    id: 'Investor_v2_0_1'
  })

  m.call(investorBeacon, 'upgradeTo', [newInvestorImplementation], {
    from: beaconOwner
  })

  return { investorBeacon, newInvestorImplementation }
})
