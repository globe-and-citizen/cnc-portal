import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'

const MockTokensModule = buildModule('MockTokens', (m) => {
  const usdc = m.contract('MockERC20', ['USD Coin', 'USDC'], { id: 'USDC' })
  const usdt = m.contract('MockERC20', ['Tether USD', 'USDT'], { id: 'USDT' })

  // Mint 1 million USDC (with 6 decimals) for test accounts
  const testAccounts = [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account #0
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account #1
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' // Account #2
  ]

  testAccounts.forEach((account, index) => {
    m.call(usdc, 'mint', [account, 1_000_000_000_000n], { id: `mint_usdc_${index}` })
    m.call(usdt, 'mint', [account, 1_000_000_000_000n], { id: `mint_usdt_${index}` })
  })

  return { usdc, usdt }
})

export default MockTokensModule
