import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const proposalBeaconModule = buildModule('ProposalBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  // Implementation remains UNINITIALIZED (initialized via beacon proxy at creation).
  // The constructor calls `_disableInitializers()` to harden against the Parity-wallet
  // class attack, so calling `initialize` on the bare impl would revert.
  const proposalImplementation = m.contract('Proposals')
  const beacon = m.contract('Beacon', [proposalImplementation], {
    from: beaconAdmin
  })

  return { beacon, proposalImplementation }
})

export default proposalBeaconModule
