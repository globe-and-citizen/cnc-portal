import VotingBeaconModule from './VotingBeaconModule'
import boardOfDirectorsBeaconModule from './BoardOfDirectorsBeaconModule'
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import bankBeaconModule from './BankBeaconModule'
import ExpenseAccountModule from './ExpenseAccountModule'
import ExpenseAccountEIP712Module from './ExpenseAccountEIP712Module'
import CashRemunerationEIP712Module from './CashRemunerationEIP712Module'

export default buildModule('Officer', (m) => {
  const beaconAdmin = m.getAccount(0)
  const officer = m.contract('Officer')
  const { beacon: bankBeacon } = m.useModule(bankBeaconModule)
  const { beacon: BoDBeacon } = m.useModule(boardOfDirectorsBeaconModule)
  const { beacon: votingBeacon } = m.useModule(VotingBeaconModule)
  const { expenseAccountFactoryBeacon } = m.useModule(ExpenseAccountModule)
  const { expenseAccountEip712FactoryBeacon } = m.useModule(ExpenseAccountEIP712Module)
  const { cashRemunerationEip712FactoryBeacon } = m.useModule(CashRemunerationEIP712Module)

  const beaconConfigs = [
    { beaconType: 'Bank', beaconAddress: bankBeacon },
    { beaconType: 'Voting', beaconAddress: votingBeacon },
    { beaconType: 'BoardOfDirectors', beaconAddress: BoDBeacon },
    { beaconType: 'ExpenseAccount', beaconAddress: expenseAccountFactoryBeacon },
    { beaconType: 'ExpenseAccountEIP712', beaconAddress: expenseAccountEip712FactoryBeacon },
    { beaconType: 'CashRemunerationEIP712', beaconAddress: cashRemunerationEip712FactoryBeacon }
  ]

  m.call(officer, 'initialize', [beaconAdmin, beaconConfigs])

  const beacon = m.contract('FactoryBeacon', [officer], {
    from: beaconAdmin
  })

  return { beacon, officer }
})
