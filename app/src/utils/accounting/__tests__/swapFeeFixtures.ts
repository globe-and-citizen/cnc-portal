import type { SwapExecution, SwapFeeEvidence, SwapFeeTarget } from '@/types/swapFees'
import type { CowOrder, CowTrade } from '@/utils/safe/cowSettlement'
import { verifyCowFees } from '@/utils/safe/cowSettlement'
import { assetMetadata } from '@/utils/tokens/assets'
import { accountFor } from '../accountRegistry'
import { journalFixture, ADDR, usd } from './fixtures'
import { history } from './safeExchangeFixtures'
import type { JournalEntry } from '../types'

export const SWAP_AMOUNT = '532944250'
export const SWAP_QUANTITY = '194336006018297504'

/** A deposit, then the recorded 532.94425 USDC → 0.194336 WETH swap through the settlement. */
export function swapFeeInput() {
  const rows = history().slice(0, 3)
  rows[0]!.value = SWAP_AMOUNT
  rows[1]!.value = SWAP_AMOUNT
  rows[2]!.value = SWAP_QUANTITY
  return rows
}

export const SETTLEMENT = '0x9008d19f58aabd9ed0d60971565aa8510560ab41'
export const HASH = `0x${'a'.repeat(64)}`
export const UID = `0x${'b'.repeat(112)}`
export const SELL = ADDR.usdcToken
export const BUY = ADDR.sherToken

const metadata = (address: string, symbol: string, decimals: number) =>
  assetMetadata(address, 137, { address, name: symbol, symbol, decimals })

/** Synthetic identities with exact base-unit amounts, never a live wallet dependency. */
export function swapFeeFixture() {
  const trade: CowTrade = {
    orderUid: UID,
    owner: ADDR.safe,
    sellToken: SELL,
    buyToken: BUY,
    sellAmount: '532944250',
    buyAmount: '194336006018297504',
    txHash: HASH,
    blockNumber: 100,
    logIndex: 244,
    executedProtocolFees: [
      { amount: '12596742639926', token: BUY, policy: { priceImprovement: { factor: 0.5 } } },
      { amount: '39149019334238', token: BUY, policy: { volume: { factor: 0.0002 } } },
      { amount: '1369941633563023', token: BUY, policy: { volume: { factor: 0.007 } } }
    ]
  }
  const order: CowOrder = {
    uid: UID,
    owner: ADDR.safe,
    receiver: ADDR.safe,
    settlementContract: SETTLEMENT,
    sellToken: SELL,
    buyToken: BUY,
    executedSellAmount: trade.sellAmount,
    executedBuyAmount: trade.buyAmount,
    executedFee: '3870494',
    executedFeeToken: SELL
  }
  const sell = metadata(SELL, 'USDC', 6)
  const buy = metadata(BUY, 'WETH', 18)
  const target: SwapFeeTarget = {
    txHash: HASH,
    safeAddress: ADDR.safe,
    timestamp: 1791206443,
    assets: [
      { address: SELL, token: sell.id, asset: sell, rawAmount: trade.sellAmount, side: 'spent' },
      { address: BUY, token: buy.id, asset: buy, rawAmount: trade.buyAmount, side: 'received' }
    ]
  }
  const execution: SwapExecution = {
    chainId: 137,
    transactionHash: HASH,
    blockNumber: '100',
    cowTrades: [trade],
    networkFee: {
      rawAmount: '655884087128658992',
      symbol: 'POL',
      decimals: 18,
      payer: ADDR.client
    }
  }
  const journal: JournalEntry = {
    ...journalFixture({ useCase: 'SAFE-SWAP', txHash: HASH }),
    lines: target.assets.map((asset, index) => {
      const line = {
        id: `swap:${index}`,
        account: accountFor('Cash — Safe', ADDR.safe),
        movement: {
          token: asset.token,
          asset: asset.asset,
          decimals: asset.asset!.decimals,
          rawAmount: BigInt(asset.rawAmount),
          rate: 1n
        }
      }
      return asset.side === 'spent'
        ? { ...line, credit: usd('532.94425') }
        : { ...line, debit: usd('532.94425') }
    })
  }
  return { target, execution, order, trade, journal }
}

/** Loaded evidence for one swap, as the Accounting composable hands it to the Safe page. */
export function swapFeeEvidence(
  fixture = swapFeeFixture(),
  state: Partial<Pick<SwapFeeEvidence, 'loading' | 'failed'>> = {}
): SwapFeeEvidence {
  return {
    target: fixture.target,
    execution: fixture.execution,
    verification: verifyCowFees(
      fixture.target,
      fixture.execution,
      [fixture.order],
      [fixture.trade]
    ),
    loading: false,
    failed: false,
    ...state
  }
}
