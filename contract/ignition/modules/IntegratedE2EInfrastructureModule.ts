import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import MockTokensModule from './MockTokensModule.js'
import OfficerModule from './OfficerModule.js'
import SafeInfraModule from './SafeInfraModule.js'

export default buildModule('IntegratedE2EInfrastructure', (m) => {
  const tokens = m.useModule(MockTokensModule)
  const safe = m.useModule(SafeInfraModule)
  const company = m.useModule(OfficerModule)

  return { ...tokens, ...safe, ...company }
})
