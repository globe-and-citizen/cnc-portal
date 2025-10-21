import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const bankBeaconModule = buildModule('BankBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const bankImplementation = m.contract('Bank')

  const beacon = m.contract('Beacon', [bankImplementation], {
    from: beaconAdmin
  })

  return { beacon, bankImplementation }
})

export default bankBeaconModule
