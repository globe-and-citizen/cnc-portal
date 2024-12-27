import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const MockTokensModule = buildModule('MockTokens', (m) => {
  const usdt = m.contract('MockERC20', ['Tether USD', 'USDT'], { id: 'USDT' })
  const usdc = m.contract('MockERC20', ['USD Coin', 'USDC'], { id: 'USDC' })

  return { usdt, usdc }
})

export default MockTokensModule
