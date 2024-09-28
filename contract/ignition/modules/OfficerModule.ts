import VotingBeaconModule from './VotingBeaconModule'
import boardOfDirectorsBeaconModule from './BoardOfDirectorsBeaconModule'
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import bankBeaconModule from './BankBeaconModule'

export default buildModule('Officer', (m) => {
  const beaconAdmin = m.getAccount(0)
  const officer = m.contract('Officer')
  const { beacon: bankBeacon } = m.useModule(bankBeaconModule)
  const { beacon: BoDBeacon } = m.useModule(boardOfDirectorsBeaconModule)
  const { beacon: votingBeacon } = m.useModule(VotingBeaconModule)
  m.call(officer, 'initialize', [bankBeacon, votingBeacon, BoDBeacon])
  const beacon = m.contract('Beacon', [officer], {
    from: beaconAdmin
  })

  return { beacon, officer }
})
