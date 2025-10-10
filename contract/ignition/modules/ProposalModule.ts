import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const proposalBeaconModule = buildModule('ProposalBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const proposalImplementation = m.contract('Proposals')
  m.call(proposalImplementation, 'initialize', [beaconAdmin])
  const beacon = m.contract('Beacon', [proposalImplementation], {
    from: beaconAdmin
  })

  return { beacon, proposalImplementation }
})

export default proposalBeaconModule
