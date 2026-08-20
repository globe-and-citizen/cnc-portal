import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import FeeCollectorModule from './FeeCollectorModule.js'

const MockTokensModule = buildModule('MockTokens', (m) => {
  const usdc = m.contract('MockERC20', ['USD Coin', 'USDC'], { id: 'USDC' })
  const usdcE = m.contract('MockERC20', ['USDC Coin Bridged', 'USDCe'], { id: 'USDCe' })
  const usdt = m.contract('MockERC20', ['Tether USD', 'USDT'], { id: 'USDT' })

  // Load recipients from recipients.json (shared with bulkTransferConfig)
  let testAccounts: string[]
  try {
    const recipientsPath = join(import.meta.dirname, '../../scripts/recipients.json')
    const fileContent = readFileSync(recipientsPath, 'utf8')
    const data = JSON.parse(fileContent)
    if (Array.isArray(data.recipients)) {
      testAccounts = data.recipients
    } else {
      throw new Error('recipients.json does not contain a valid recipients array')
    }
  } catch (e) {
    throw new Error('Failed to load recipients from recipients.json: ' + (e as Error).message, {
      cause: e
    })
  }

  testAccounts.forEach((account, index) => {
    m.call(usdc, 'mint', [account, 1_000_000_000_000n], { id: `mint_usdc_${index}` })
    m.call(usdcE, 'mint', [account, 1_000_000_000_000n], { id: `mint_usdcE_${index}` })
    m.call(usdt, 'mint', [account, 1_000_000_000_000n], { id: `mint_usdt_${index}` })
  })

  // The FeeCollector is initialized with the *Polygon* USDC / USDT addresses, so
  // on a local chain none of the mock tokens is a fee token. `Bank.transferToken`
  // skips the fee entirely for a token the collector doesn't support
  // (`isFeeCollectorToken` → false), so the recipient would receive 100% of the
  // amount and no `FeePaid` would ever be emitted. Register the mocks here so a
  // local ERC-20 transfer is charged the same 0.5% as on Polygon.
  const { feeCollector } = m.useModule(FeeCollectorModule)
  m.call(feeCollector, 'addTokenSupport', [usdc], { id: 'fee_token_usdc' })
  m.call(feeCollector, 'addTokenSupport', [usdcE], { id: 'fee_token_usdcE' })
  m.call(feeCollector, 'addTokenSupport', [usdt], { id: 'fee_token_usdt' })

  return { usdc, usdcE, usdt }
})

export default MockTokensModule
