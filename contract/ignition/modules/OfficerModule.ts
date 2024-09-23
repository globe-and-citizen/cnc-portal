import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import boardOfDirectorsBeaconModule from './BoardOfDirectorsBeaconModule'
import VotingBeaconModule from './VotingBeaconModule'

export default buildModule('Officer', (m) => {
  const beaconAdmin = m.getAccount(0)
  const officer = m.contract('Officer')
  const { beacon: BoDBeacon } = m.useModule(boardOfDirectorsBeaconModule)
  const { beacon: votingBeacon } = m.useModule(VotingBeaconModule)
  m.call(officer, 'initialize', [BoDBeacon, votingBeacon])
  const beacon = m.contract('Beacon', [officer], {
    from: beaconAdmin
  })

  return { beacon, officer }
})
