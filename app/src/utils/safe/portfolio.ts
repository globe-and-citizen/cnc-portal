/** Pure adapters for the Safe Client Gateway response. */
import { formatUnits } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { TokenOption } from '@/types'
import type { SafeClientBalance, SafeClientBalances } from '@/types/safe'
import type { TokenHoldingRow } from '@/utils/tokens/holdings'
import { formatExactNumber, formatNumber } from '@/utils/format'
import { formatCurrencyShort } from '@/utils/currency/display'
import { assetLogoUri } from '@/utils/tokens/assets'

function parseFiatAmount(value: string | null): number | null {
  if (value === null || !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function getTokenQuantity(item: SafeClientBalance): string | null {
  const { decimals } = item.tokenInfo
  return item.balance !== null &&
    /^\d+$/.test(item.balance) &&
    Number.isInteger(decimals) &&
    decimals >= 0 &&
    decimals <= 18
    ? formatUnits(BigInt(item.balance), decimals)
    : null
}

/** One provider item becomes one table row, in the same order. */
export function toSafeHoldingRows(
  data?: SafeClientBalances,
  currencyCode = 'USD'
): TokenHoldingRow[] {
  return (data?.items ?? []).map((item, index) => {
    const { tokenInfo } = item
    const quantity = getTokenQuantity(item)
    const amountLabel = quantity === null ? 'Balance unavailable' : formatNumber(quantity)
    const conversion = parseFiatAmount(item.fiatConversion)
    const price = conversion !== null && conversion > 0 ? conversion : null
    const balance =
      quantity === '0'
        ? 0
        : quantity !== null && price !== null
          ? parseFiatAmount(item.fiatBalance)
          : null
    return {
      rank: index + 1,
      token: { name: tokenInfo.name, symbol: tokenInfo.symbol },
      name: tokenInfo.name,
      address: tokenInfo.type === 'ERC20' ? tokenInfo.address : null,
      icon: assetLogoUri(tokenInfo.logoUri) ?? null,
      quantity: quantity === null ? 'Balance unavailable' : formatExactNumber(quantity),
      amountLabel:
        quantity !== null && Number(quantity) > 0 && amountLabel === '0'
          ? '<' + formatNumber(0.0001)
          : amountLabel,
      amount: quantity === null ? null : Number(quantity),
      price,
      priceLabel: price === null ? 'Price unavailable' : formatCurrencyShort(price, currencyCode),
      balance,
      balanceLabel:
        balance === null ? 'Value unavailable' : formatCurrencyShort(balance, currencyCode)
    }
  })
}

/** Read the provider total only when every returned holding can be valued. */
export function getSafeFiatTotal(data?: SafeClientBalances): number | undefined {
  if (!data) return undefined
  if (data.items.length === 0) return 0
  const complete = data.items.every((item) => {
    const quantity = getTokenQuantity(item)
    const price = parseFiatAmount(item.fiatConversion)
    return (
      quantity !== null &&
      (quantity === '0' ||
        (price !== null && price > 0 && parseFiatAmount(item.fiatBalance) !== null))
    )
  })
  return complete ? (parseFiatAmount(data.fiatTotal) ?? undefined) : undefined
}

/** Transfer choices remain restricted to configured payment contracts. */
export function toSafeTransferTokens(data?: SafeClientBalances): TokenOption[] {
  if (!data) return []
  return SUPPORTED_TOKENS.map((token) => {
    const item = data.items.find(({ tokenInfo }) =>
      token.id === 'native'
        ? tokenInfo.type === 'NATIVE_TOKEN' || tokenInfo.type === 'ETHER'
        : tokenInfo.type === 'ERC20' &&
          tokenInfo.address.toLowerCase() === token.address.toLowerCase()
    )
    const quantity =
      item && item.tokenInfo.decimals === token.decimals ? getTokenQuantity(item) : null
    return {
      symbol: token.symbol,
      tokenId: token.id,
      name: token.name,
      balance: quantity === null ? 0 : Number(quantity),
      price: item ? (parseFiatAmount(item.fiatConversion) ?? 0) : 0,
      code: token.code
    }
  })
}
