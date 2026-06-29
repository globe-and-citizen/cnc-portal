import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const fixedReturnBeaconModule = buildModule('FixedReturnBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const fixedReturnImplementation = m.contract('FixedReturn')

  const beacon = m.contract('Beacon', [fixedReturnImplementation], {
    from: beaconAdmin
  })

  return { beacon, fixedReturnImplementation }
})

export default fixedReturnBeaconModule
