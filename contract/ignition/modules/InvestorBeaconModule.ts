import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
const investorBeaconModule = buildModule('InvestorBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const investorImplementation = m.contract('Investor')

  const beacon = m.contract('Beacon', [investorImplementation], {
    from: beaconAdmin
  })

  return { beacon, investorImplementation }
})

export default investorBeaconModule
