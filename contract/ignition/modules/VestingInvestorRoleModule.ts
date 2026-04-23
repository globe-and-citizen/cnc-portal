import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import officerModule from './OfficerModule'
import vestingModule from './VestingProxyModule'

export default buildModule('VestingInvestorRoleModule', (m) => {
  const { officer } = m.useModule(officerModule)
  const { vesting } = m.useModule(vestingModule)

  const investorV1Address = m.staticCall(officer, 'findDeployedContract', ['InvestorV1'], 0, {
    id: 'find_investor_v1_for_vesting_role'
  })
  const investorV1 = m.contractAt('InvestorV1', investorV1Address, {
    id: 'investor_v1_for_vesting_role'
  })

  // Validation step: this static call must succeed, otherwise deployment halts
  // (for example when Officer still returns address(0) for InvestorV1).
  m.staticCall(investorV1, 'DEFAULT_ADMIN_ROLE', [], 0, {
    id: 'validate_investor_v1_for_vesting_role'
  })

  const minterRole = m.staticCall(investorV1, 'MINTER_ROLE', [], 0, {
    id: 'investor_v1_minter_role_for_vesting_role'
  })

  m.call(investorV1, 'grantRole', [minterRole, vesting], {
    id: 'grant_investor_v1_minter_role_to_vesting'
  })

  return { investorV1, vesting }
})
