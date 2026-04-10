import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const votingBeaconModule = buildModule('VotingBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  // Implementation remains UNINITIALIZED (initialized via beacon proxy at creation).
  // The constructor calls `_disableInitializers()` to harden against the Parity-wallet
  // class attack, so calling `initialize` on the bare impl would revert.
  const votingImplementation = m.contract('Voting')
  const beacon = m.contract('Beacon', [votingImplementation], {
    from: beaconAdmin
  })

  return { beacon, votingImplementation }
})

export default votingBeaconModule
