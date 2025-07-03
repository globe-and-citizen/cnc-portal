import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const electionsBeaconModule = buildModule('ElectionsBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const electionsImplementation = m.contract('Elections')
  m.call(electionsImplementation, 'initialize', [beaconAdmin])
  const beacon = m.contract('Beacon', [electionsImplementation], {
    from: beaconAdmin
  })

  return { beacon, electionsImplementation }
})

export default electionsBeaconModule
