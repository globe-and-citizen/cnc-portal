import VotingBeaconModule from './VotingBeaconModule'
import boardOfDirectorsBeaconModule from './BoardOfDirectorsBeaconModule'
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import bankBeaconModule from './BankBeaconModule'
import ExpenseAccountModule from './ExpenseAccountModule'
import ExpenseAccountEIP712Module from './ExpenseAccountEIP712Module'
import investorsV1BeaconModule from './InvestorsV1BeaconModule'

export default buildModule('Officer', (m) => {
  const beaconAdmin = m.getAccount(0)
  const officer = m.contract('Officer')
  const { beacon: bankBeacon } = m.useModule(bankBeaconModule)
  const { beacon: BoDBeacon } = m.useModule(boardOfDirectorsBeaconModule)
  const { beacon: votingBeacon } = m.useModule(VotingBeaconModule)
  const { beacon: investorsV1Beacon } = m.useModule(investorsV1BeaconModule)
  const { expenseAccountFactoryBeacon } = m.useModule(ExpenseAccountModule)
  const { expenseAccountEip712FactoryBeacon } = m.useModule(ExpenseAccountEIP712Module)
  m.call(officer, 'initialize', [
    beaconAdmin,
    bankBeacon,
    votingBeacon,
    BoDBeacon,
    expenseAccountFactoryBeacon,
    expenseAccountEip712FactoryBeacon,
    investorsV1Beacon
  ])
  const beacon = m.contract('FactoryBeacon', [officer], {
    from: beaconAdmin
  })

  return { beacon, officer }
})
