import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('ElectionsModule', (m) => {
  const beaconOwner = m.getAccount(0)

  const elections = m.contract('Elections')

  const electionsFactoryBeacon = m.contract(
    'FactoryBeacon', 
    [elections],
    {from: beaconOwner}
  )

  return { elections, electionsFactoryBeacon }
})