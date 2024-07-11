import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const bankBeaconModule = buildModule('BankBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const bankContractImplementation = m.contract('BankV2')
  const beacon = m.contract('Beacon', [bankContractImplementation], {
    from: beaconAdmin,
  })

  return { beacon }
})

export default bankBeaconModule
