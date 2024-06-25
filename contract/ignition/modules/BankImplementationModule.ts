import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const bankImplementationModule = buildModule('Bank', (moduleBuilder) => {
  const BankContractImplementation = moduleBuilder.contract('Bank')

  // Use of polygon deployed tips contract addredd: look in .openzeppelin/polygon.json
  moduleBuilder.call(BankContractImplementation, 'initialize', [
    '0xDC0466d0406bf3770d08B1C681241465De5BF455'
  ])

  return { BankContractImplementation }
})

export default bankImplementationModule
