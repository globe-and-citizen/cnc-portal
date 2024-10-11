import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('ExpenseAccountModule', (m) => {
  const beaconOwner = m.getAccount(0)

  const expenseAccount = m.contract('ExpenseAccount')

  const expenseAccountFactoryBeacon = m.contract(
    'FactoryBeacon', 
    [expenseAccount],
    {from: beaconOwner}
  )

  return { expenseAccount, expenseAccountFactoryBeacon }
})