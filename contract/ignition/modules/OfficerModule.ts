import boardOfDirectorsBeaconModule from './BoardOfDirectorsBeaconModule'
import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import bankBeaconModule from './BankBeaconModule'
// import ExpenseAccountModule from './ExpenseAccountModule'
import ExpenseAccountEIP712Module from './ExpenseAccountEIP712Module'
import investorsV1BeaconModule from './InvestorsV1BeaconModule'
import CashRemunerationEIP712Module from './CashRemunerationEIP712Module'
import SafeDepositRouterBeaconModule from './SafeDepositRouterBeaconModule'
import proposalBeaconModule from './ProposalModule'
import electionsBeaconModule from './ElectionsModule'
import FeeCollectorModule from './FeeCollectorModule'

export default buildModule('Officer', (m) => {
  const beaconAdmin = m.getAccount(0)
  const { feeCollector } = m.useModule(FeeCollectorModule)
  const officer = m.contract('Officer', [feeCollector])

  // We still useModule these sub-modules so their beacons are deployed as part of
  // the Officer deployment graph. Per-team Officer proxies (spawned via
  // FactoryBeacon.createBeaconProxy) register their beacon addresses at runtime via
  // `initialize`; we do NOT pre-register them against the bare implementation here.
  m.useModule(bankBeaconModule)
  m.useModule(boardOfDirectorsBeaconModule)
  m.useModule(proposalBeaconModule)
  m.useModule(electionsBeaconModule)
  m.useModule(investorsV1BeaconModule)
  // m.useModule(ExpenseAccountModule)
  m.useModule(ExpenseAccountEIP712Module)
  m.useModule(CashRemunerationEIP712Module)
  m.useModule(SafeDepositRouterBeaconModule)

  // NOTE: We intentionally do NOT call `initialize` on the Officer implementation.
  // The impl is only used as a delegatecall target for per-team Officer proxies
  // spawned via FactoryBeacon.createBeaconProxy, each of which runs its own
  // `initialize` at creation. Additionally, the Officer constructor now calls
  // `_disableInitializers()` to harden the implementation against the Parity-wallet
  // class attack, so calling `initialize` on the bare impl would revert with
  // `InvalidInitialization()`.

  const beacon = m.contract('FactoryBeacon', [officer], {
    from: beaconAdmin
  })

  return { beacon, officer }
})
