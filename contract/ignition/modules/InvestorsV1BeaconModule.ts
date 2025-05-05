import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
const investorsV1BeaconModule = buildModule('InvestorsV1BeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const investorsImplementation = m.contract('InvestorV1')

  const beacon = m.contract('Beacon', [investorsImplementation], {
    from: beaconAdmin
  })

  return { beacon, investorsImplementation }
})

export default investorsV1BeaconModule
