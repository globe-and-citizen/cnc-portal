// In-page stand-in for the Safe Client Gateway holdings read. Balances come
// from the real E2E chain; every asset is valued at the stubbed $1 token price.
import type { Page } from '@playwright/test'
import { formatUnits, zeroAddress, type Address } from 'viem'
import type { SafeClientBalance, SafeClientBalances } from '../../../src/types/safe'
import { E2E_USDC_ADDRESS, E2E_USDCE_ADDRESS, nativeBalance, tokenBalance } from '../e2e-chain'
import { json } from '../e2e-page'

/** The app keeps the production Gateway origin under E2E; only the Hardhat chain is stubbed. */
const BALANCES_ROUTE =
  /^https:\/\/safe-client\.safe\.global\/v1\/chains\/31337\/safes\/(0x[a-fA-F0-9]{40})\/balances\//

const ERC20_TOKENS = [
  { address: E2E_USDC_ADDRESS, name: 'USD Coin', symbol: 'USDC' },
  { address: E2E_USDCE_ADDRESS, name: 'USDC Coin Bridged', symbol: 'USDCe' }
]

const holding = (tokenInfo: SafeClientBalance['tokenInfo'], raw: bigint): SafeClientBalance => ({
  tokenInfo,
  balance: raw.toString(),
  fiatConversion: '1',
  fiatBalance: formatUnits(raw, tokenInfo.decimals)
})

/** Like the real Gateway, the native asset is always listed and ERC-20s only once held. */
async function safeBalances(safe: Address): Promise<SafeClientBalances> {
  const [native, ...tokens] = await Promise.all([
    nativeBalance(safe).then((raw) =>
      holding(
        { type: 'NATIVE_TOKEN', address: zeroAddress, decimals: 18, symbol: 'GO', name: 'GO' },
        raw
      )
    ),
    ...ERC20_TOKENS.map((token) =>
      tokenBalance(token.address, safe).then((raw) =>
        holding({ type: 'ERC20', decimals: 6, ...token }, raw)
      )
    )
  ])
  const items = [native, ...tokens.filter((item) => item.balance !== '0')]
  const fiatTotal = items.reduce((total, item) => total + Number(item.fiatBalance), 0)
  return { fiatTotal: String(fiatTotal), items }
}

export async function stubSafeClientGateway(page: Page): Promise<void> {
  await page.route(BALANCES_ROUTE, async (route) => {
    const safe = BALANCES_ROUTE.exec(route.request().url())?.[1] as Address
    await route.fulfill(json(await safeBalances(safe)))
  })
}
