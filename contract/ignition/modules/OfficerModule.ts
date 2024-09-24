import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('Officer', (m) => {
  const beaconAdmin = m.getAccount(0)
  const officer = m.contract('Officer')

  const beacon = m.contract('Beacon', [officer], {
    from: beaconAdmin
  })

  return { beacon, officer }
})
