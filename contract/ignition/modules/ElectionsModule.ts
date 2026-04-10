import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const electionsBeaconModule = buildModule('ElectionsBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  // Implementation remains UNINITIALIZED (initialized via beacon proxy at creation).
  // The constructor calls `_disableInitializers()` to harden against the Parity-wallet
  // class attack, so calling `initialize` on the bare impl would revert.
  const electionsImplementation = m.contract('Elections')
  const beacon = m.contract('Beacon', [electionsImplementation], {
    from: beaconAdmin
  })

  return { beacon, electionsImplementation }
})

export default electionsBeaconModule
