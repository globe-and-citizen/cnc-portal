import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const bankBeaconModule = buildModule('BankBeaconModule', (m) => {
  const beaconAdmin = m.getAccount(0)
  const bankImplementation = m.contract('Bank')

  // Call the implementation function initialize by passing the address of the tips
  m.call(bankImplementation, 'initialize', ['0x79EF3aE86725D7D0Ae4eF3A31758A7c7fe40e5B4'])
  const beacon = m.contract('Beacon', [bankImplementation], {
    from: beaconAdmin
  })

  return { beacon, bankImplementation }
})

export default bankBeaconModule
