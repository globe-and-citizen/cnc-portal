import VotingBeaconModule from './VotingBeaconModule'
import boardOfDirectorsBeaconModule from './BoardOfDirectorsBeaconModule'
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import bankBeaconModule from './BankBeaconModule'
import ExpenseAccountModule from './ExpenseAccountModule'

export default buildModule('Officer', (m) => {
  const beaconAdmin = m.getAccount(0)
  const officer = m.contract('Officer')
  const { beacon: bankBeacon } = m.useModule(bankBeaconModule)
  const { beacon: BoDBeacon } = m.useModule(boardOfDirectorsBeaconModule)
  const { beacon: votingBeacon } = m.useModule(VotingBeaconModule)
  const { expenseAccountFactoryBeacon } = m.useModule(ExpenseAccountModule)
  m.call(officer, 'initialize', [
    beaconAdmin,
    bankBeacon,
    votingBeacon,
    BoDBeacon,
    expenseAccountFactoryBeacon
  ])
  const beacon = m.contract('FactoryBeacon', [officer], {
    from: beaconAdmin
  })

  return { beacon, officer }
})
