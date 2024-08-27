import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import tipsModule from './ProxyModule'

// Module to deploy the Bank contract implementation and initialize it with the tips address
const bankImplementationModule = buildModule('Bank', (moduleBuilder) => {
  const BankContractImplementation = moduleBuilder.contract('Bank')

  const { tips } = moduleBuilder.useModule(tipsModule)
  moduleBuilder.call(BankContractImplementation, 'initialize', [tips.address])

  return { BankContractImplementation }
})

export default bankImplementationModule
