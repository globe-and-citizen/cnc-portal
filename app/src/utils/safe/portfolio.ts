/** Pure presentation of the Safe Client Gateway holdings response. */
import { formatUnits } from 'viem'
import { currentChainId, SUPPORTED_TOKENS } from '@/constant'
import type { TokenOption } from '@/types'
import type { SafeClientBalance, SafeClientBalances } from '@/types/safe'
import { formatExactNumber, formatNumber } from '@/utils/format'
import { formatCurrencyShort } from '@/utils/currency/display'
import { assetId, assetLogoUri } from '@/utils/tokens/assets'
import { getConfirmedSafeSpam } from './confirmedSpam'

function numericValue(value: string | null): number | null {
  if (value === null || !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function nativeToken(item: SafeClientBalance): boolean {
  return item.tokenInfo.type === 'NATIVE_TOKEN' || item.tokenInfo.type === 'ETHER'
}

function admittedItems(data: SafeClientBalances | undefined, chainId: number) {
  const unique = new Map<string, SafeClientBalance>()
  for (const item of data?.items ?? []) {
    if (
      !nativeToken(item) &&
      getConfirmedSafeSpam(
        { type: 'ERC20_TRANSFER', tokenAddress: item.tokenInfo.address },
        chainId
      )
    )
      continue
    const id = nativeToken(item) ? `native:${chainId}` : assetId(item.tokenInfo.address, chainId)
    if (!unique.has(id)) unique.set(id, item)
  }
  return [...unique.values()]
}

function exactQuantity(item: SafeClientBalance): string | null {
  const { decimals } = item.tokenInfo
  return item.balance !== null &&
    /^\d+$/.test(item.balance) &&
    Number.isInteger(decimals) &&
    decimals >= 0 &&
    decimals <= 18
    ? formatUnits(BigInt(item.balance), decimals)
    : null
}

function holdingAmountLabel(quantity: string | null) {
  if (quantity === null) return 'Balance unavailable'
  const formatted = formatNumber(quantity)
  return Number(quantity) > 0 && formatted === '0' ? `<${formatNumber(0.0001)}` : formatted
}

/** Keep provider order and returned zero balances; absent currencies are never synthesized. */
export function safePortfolioRows(
  data?: SafeClientBalances,
  currencyCode = 'USD',
  chainId = currentChainId
) {
  return admittedItems(data, chainId).map((item, index) => {
    const quantity = exactQuantity(item)
    const conversion = numericValue(item.fiatConversion)
    const price = conversion !== null && conversion > 0 ? conversion : null
    const balance =
      quantity === '0'
        ? 0
        : quantity !== null && price !== null
          ? numericValue(item.fiatBalance)
          : null
    return {
      id: nativeToken(item) ? `native:${chainId}` : assetId(item.tokenInfo.address, chainId),
      name: item.tokenInfo.name,
      symbol: item.tokenInfo.symbol,
      address: nativeToken(item) ? null : item.tokenInfo.address,
      icon: assetLogoUri(item.tokenInfo.logoUri) ?? null,
      quantity: quantity === null ? 'Balance unavailable' : formatExactNumber(quantity),
      amountLabel: holdingAmountLabel(quantity),
      amount: quantity === null ? null : Number(quantity),
      price,
      priceLabel: price === null ? 'Price unavailable' : formatCurrencyShort(price, currencyCode),
      balance,
      balanceLabel:
        balance === null ? 'Value unavailable' : formatCurrencyShort(balance, currencyCode),
      token: { name: item.tokenInfo.name, symbol: item.tokenInfo.symbol },
      rank: index + 1
    }
  })
}

/** A missing quantity or a nonzero unpriced holding keeps the total unavailable. */
export function safeBalancesTotal(
  data?: SafeClientBalances,
  chainId = currentChainId
): number | undefined {
  if (!data) return undefined
  const rows = safePortfolioRows(data, 'USD', chainId)
  if (rows.some((row) => row.balance === null)) return undefined
  if (rows.length === 0) return 0
  if (rows.length === data.items.length) return numericValue(data.fiatTotal) ?? undefined
  return rows.reduce((sum, row) => sum + row.balance!, 0)
}

/** Match the configured CNC payment allowlist by identity, never by provider symbol. */
export function safeTransferTokens(data?: SafeClientBalances): TokenOption[] {
  if (!data) return []
  const items = admittedItems(data, currentChainId)
  return SUPPORTED_TOKENS.map((token) => {
    const item = items.find((entry) =>
      token.id === 'native'
        ? nativeToken(entry)
        : !nativeToken(entry) &&
          entry.tokenInfo.address.toLowerCase() === token.address.toLowerCase()
    )
    const quantity = item && item.tokenInfo.decimals === token.decimals ? exactQuantity(item) : null
    const price = item ? (numericValue(item.fiatConversion) ?? 0) : 0
    return {
      symbol: token.symbol,
      tokenId: token.id,
      name: token.name,
      balance: quantity === null ? 0 : Number(quantity),
      price,
      code: token.code
    }
  })
}
