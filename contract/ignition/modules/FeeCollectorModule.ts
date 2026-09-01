import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
//import MockTokensModule from "./MockTokensModule";
const FeeCollectorProxyModule = buildModule('FeeCollectorProxyModule', (m) => {
  const deployer = m.getAccount(0)

  // Implementation
  const feeCollectorImpl = m.contract('FeeCollector')

  // ********* use this for hardhat
  // const { usdc, usdt } = m.useModule(MockTokensModule)
  // const supportedTokens = [usdc, usdt]

  //**use this for polygon */
  const supportedTokens = [
    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
  ]

  // Fee configuration
  const feeConfigs = [
    { contractType: 'BANK', feeBps: 50 } // 0.5%
  ]

  // OpenZeppelin's ERC1967Proxy reverts with ERC1967ProxyUninitialized() if it is
  // deployed with empty init data, so the proxy and its initialize() call must be
  // encoded atomically instead of deploying first and calling initialize after.
  const initData = m.encodeFunctionCall(feeCollectorImpl, 'initialize', [
    deployer,
    feeConfigs,
    supportedTokens
  ])

  // Create the transparent proxy, initialized atomically on deployment
  const proxy = m.contract('TransparentUpgradeableProxy', [feeCollectorImpl, deployer, initData])

  // Detect the ProxyAdmin assigned to this proxy
  const proxyAdminAddress = m.readEventArgument(proxy, 'AdminChanged', 'newAdmin')

  // Load ProxyAdmin instance
  const proxyAdmin = m.contractAt('ProxyAdmin', proxyAdminAddress)

  return { proxy, proxyAdmin, feeCollectorImpl }
})

const FeeCollectorModule = buildModule('FeeCollectorModule', (m) => {
  // Use the proxy module we just defined
  const { proxy, proxyAdmin } = m.useModule(FeeCollectorProxyModule)

  // Now attach FeeCollector ABI to proxy address
  const feeCollector = m.contractAt('FeeCollector', proxy)

  return { feeCollector, proxy, proxyAdmin }
})

export default FeeCollectorModule
