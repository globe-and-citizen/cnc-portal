import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import tipsModule from './ProxyModule'
const bankBeaconModule = buildModule('BankBeaconModule', (m) => {
  const { tips } = m.useModule(tipsModule)
  const beaconAdmin = m.getAccount(0)
  const bankImplementation = m.contract('Bank')

  // Call the implementation function initialize by passing the address of the tips
  m.call(bankImplementation, 'initialize', [tips.address])
  const beacon = m.contract('Beacon', [bankImplementation], {
    from: beaconAdmin
  })

  return { beacon, bankImplementation }
})

export default bankBeaconModule
