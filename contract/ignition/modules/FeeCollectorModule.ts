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

  // Use the proxy module we just defined
  const { proxy, proxyAdmin } = m.useModule(FeeCollectorProxyModule)

  // Now attach FeeCollector ABI to proxy address
  const feeCollector = m.contractAt('FeeCollector', proxy)

  // Example fee config (edit as needed)
  const feeConfigs = [
    { contractType: 'Bank', feeBps: 50 } // 0.5%
    // add more contract types later
  ]

  // Call initialize ONCE (only on proxy)
  m.call(feeCollector, 'initialize', [deployer, feeConfigs])

  return { feeCollector, proxy, proxyAdmin }
})

export default FeeCollectorModule
