import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

export default buildModule('FeeCollectorUpgradeModule', (m) => {
  // This should be the same account that was used as initialOwner of ProxyAdmin
  const admin = m.getAccount(0) // the proxy admin account
  //0xba2023f86c8f1d57e8057508c90f7b3f6f0f73e
  
  // 1. Deploy new implementation (must match your Solidity contract name)
  const newImpl = m.contract('FeeCollectorV2', [], {
    id: 'FeeCollectorV2_impl_v4',
  })

  // 2. Existing proxy address (from your JSON)
  const proxyAddress = '0xcdC29d25483f928Ab7108cfE067D21D9C0d5735B' // the  proxy address on polygon

  // 3. Existing ProxyAdmin (from your JSON)
  const proxyAdminContract = m.contractAt(
    'ProxyAdmin',
    '0x7f51beeeedebd79078d9e57e78c5f9c8230ad7cd',// the proxy admin address
    { id: 'FeeCollectorProxyAdmin_v4' }
  )

  // 4. Call upgradeAndCall(proxy, implementation, data)
  //    data = "0x" → no extra call (no initializer)
  m.call(
    proxyAdminContract,
    'upgradeAndCall',
    [proxyAddress, newImpl, '0x'],
    { from: admin }
  )

  // 5. Bind new ABI to the proxy for later interaction
  const feeCollector = m.contractAt('FeeCollectorV2', proxyAddress, {
    id: 'FeeCollectorProxyABI_v4',
  })

  return { newImpl, feeCollector }
})
