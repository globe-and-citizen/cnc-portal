import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('ExpenseAccountEIP712Module', (m) => {
  const beaconOwner = m.getAccount(0)

  const expenseAccountEip712 = m.contract('ExpenseAccountEIP712')

  const expenseAccountEip712FactoryBeacon = m.contract(
    'FactoryBeacon', 
    [expenseAccountEip712],
    {from: beaconOwner}
  )

  return { expenseAccountEip712, expenseAccountEip712FactoryBeacon }
})