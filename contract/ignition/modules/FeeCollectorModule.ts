import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

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

  // Use the proxy module we just defined
  const { proxy, proxyAdmin } = m.useModule(FeeCollectorProxyModule)

  // Now attach FeeCollector ABI to proxy address
  const feeCollector = m.contractAt('FeeCollector', proxy)

  // Fee configuration
  const feeConfigs = [
    { contractType: 'BANK', feeBps: 50 } // 0.5%
  ]

  // Supported tokens array (same pattern as Bank)
  const supportedTokens = ['0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F']

  // Call initialize with token addresses array
  m.call(feeCollector, 'initialize', [deployer, feeConfigs, supportedTokens])

  return { feeCollector, proxy, proxyAdmin }
})

export default FeeCollectorModule
