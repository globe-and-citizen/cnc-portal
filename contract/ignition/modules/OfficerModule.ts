import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import boardOfDirectorsBeaconModule from './BoardOfDirectorsBeaconModule'
import VotingBeaconModule from './VotingBeaconModule'

export default buildModule('Officer', (m) => {
  const officer = m.contract('Officer')
  const { beacon } = m.useModule(boardOfDirectorsBeaconModule)
  const { beacon: votingBeacon } = m.useModule(VotingBeaconModule)
  m.call(officer, 'initialize', [beacon, votingBeacon])
  return { officer }
})
