import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import MockTokensModule from './MockTokensModule'

const FeeCollectorProxyModule = buildModule('FeeCollectorProxyModule', (m) => {
  const deployer = m.getAccount(0)

  // Implementation
  const feeCollectorImpl = m.contract('FeeCollector')

  // Create the transparent proxy (initializer empty for now)
  const proxy = m.contract('TransparentUpgradeableProxy', [feeCollectorImpl, deployer, '0x'])

  // Detect the ProxyAdmin assigned to this proxy
  const proxyAdminAddress = m.readEventArgument(proxy, 'AdminChanged', 'newAdmin')

  // Load ProxyAdmin instance
  const proxyAdmin = m.contractAt('ProxyAdmin', proxyAdminAddress)

  return { proxy, proxyAdmin, feeCollectorImpl }
})

const FeeCollectorModule = buildModule('FeeCollectorModule', (m) => {
  const deployer = m.getAccount(0)

  // Get mock tokens for local/test networks
  const { usdc, usdt } = m.useModule(MockTokensModule)

  // Use the proxy module we just defined
  const { proxy, proxyAdmin } = m.useModule(FeeCollectorProxyModule)

  // Now attach FeeCollector ABI to proxy address
  const feeCollector = m.contractAt('FeeCollector', proxy)

  // Fee configuration
  const feeConfigs = [
    { contractType: 'BANK', feeBps: 50 } // 0.5%
  ]

  // Supported tokens array (same pattern as Bank)
  const supportedTokens = [usdt, usdc]

  // Call initialize with token addresses array
  m.call(feeCollector, 'initialize', [deployer, feeConfigs, supportedTokens])

  return { feeCollector, proxy, proxyAdmin }
})

export default FeeCollectorModule
