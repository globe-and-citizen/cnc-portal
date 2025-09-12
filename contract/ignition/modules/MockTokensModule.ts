import { buildModule } from '@nomicfoundation/hardhat-ignition/modules'
import { readFileSync } from 'fs'
import { join } from 'path'

const MockTokensModule = buildModule('MockTokens', (m) => {
  const usdc = m.contract('MockERC20', ['USD Coin', 'USDC'], { id: 'USDC' })
  const usdt = m.contract('MockERC20', ['Tether USD', 'USDT'], { id: 'USDT' })


  // Load recipients from recipients.json (shared with bulkTransferConfig)
  let testAccounts: string[] = []
  try {
    const recipientsPath = join(__dirname, '../../scripts/recipients.json')
    const fileContent = readFileSync(recipientsPath, 'utf8')
    const data = JSON.parse(fileContent)
    if (Array.isArray(data.recipients)) {
      testAccounts = data.recipients
    } else {
      throw new Error('recipients.json does not contain a valid recipients array')
    }
  } catch (e) {
    throw new Error('Failed to load recipients from recipcdients.json: ' + (e as Error).message)
  }

  testAccounts.forEach((account, index) => {
    m.call(usdc, 'mint', [account, 1_000_000_000_000n], { id: `mint_usdc_${index}` })
    m.call(usdt, 'mint', [account, 1_000_000_000_000n], { id: `mint_usdt_${index}` })
  })

  return { usdc, usdt }
})

export default MockTokensModule
