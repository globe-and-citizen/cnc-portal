import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const vestingProxyModule = buildModule('VestingProxyModule', (m) => {
  const proxyAdminOwner = m.getAccount(0)

  const vestingImpl = m.contract('Vesting')

  const proxy = m.contract('TransparentUpgradeableProxy', [vestingImpl, proxyAdminOwner, '0x'])

  const proxyAdminAddress = m.readEventArgument(proxy, 'AdminChanged', 'newAdmin')

  const proxyAdmin = m.contractAt('ProxyAdmin', proxyAdminAddress)

  return { proxyAdmin, proxy }
})

export const vestingModule = buildModule('VestingModule', (m) => {
  const { proxy, proxyAdmin } = m.useModule(vestingProxyModule)
  const vesting = m.contractAt('Vesting', proxy)
  m.call(vesting, 'initialize', [])
  return { vesting, proxy, proxyAdmin }
})

export default vestingModule
