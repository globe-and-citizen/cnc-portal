import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const boardOfDirectorsBeaconModule = buildModule('BoardOfDirectorsModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const boardOfDirectorsImplementation = m.contract('BoardOfDirectors')
  const beacon = m.contract('FactoryBeacon', [boardOfDirectorsImplementation], {
    from: beaconAdmin
  })

  return { beacon, boardOfDirectorsImplementation }
})

export default boardOfDirectorsBeaconModule
