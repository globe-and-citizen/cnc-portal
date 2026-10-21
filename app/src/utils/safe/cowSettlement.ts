/** CoW settlement evidence: receipt Trade logs, provider records and their exact match. */
import { decodeEventLog, parseAbi, type TransactionReceipt } from 'viem'
import { z } from 'zod'
import type {
  CowTradeExecution,
  SwapExecution,
  SwapFeeTarget,
  SwapFeeVerification
} from '@/types/swapFees'

const SETTLEMENT = '0x9008d19f58aabd9ed0d60971565aa8510560ab41'
const tradeAbi = parseAbi([
  'event Trade(address indexed owner, address sellToken, address buyToken, uint256 sellAmount, uint256 buyAmount, uint256 feeAmount, bytes orderUid)'
])
const address = z
  .string()
  .regex(/^0x[\da-f]{40}$/i)
  .transform((value) => value.toLowerCase())
const amount = z.string().regex(/^\d{1,78}$/)
const uid = z
  .string()
  .regex(/^0x[\da-f]{112}$/i)
  .transform((value) => value.toLowerCase())

export const cowOrdersSchema = z.array(
  z.object({
    uid,
    owner: address,
    receiver: address.nullable().optional(),
    settlementContract: address,
    sellToken: address,
    buyToken: address,
    executedSellAmount: amount,
    executedBuyAmount: amount,
    executedFee: amount.optional(),
    executedFeeToken: address.optional()
  })
)

export const cowTradesSchema = z.array(
  z.object({
    orderUid: uid,
    owner: address,
    sellToken: address,
    buyToken: address,
    sellAmount: amount,
    buyAmount: amount,
    txHash: z
      .string()
      .regex(/^0x[\da-f]{64}$/i)
      .transform((value) => value.toLowerCase())
      .nullable(),
    blockNumber: z.number().int().nonnegative().safe(),
    logIndex: z.number().int().nonnegative().safe(),
    executedProtocolFees: z
      .array(
        z.object({
          amount,
          token: address,
          policy: z.record(z.string(), z.unknown())
        })
      )
      .optional()
  })
)

export type CowOrder = z.infer<typeof cowOrdersSchema>[number]
export type CowTrade = z.infer<typeof cowTradesSchema>[number]

/** This adapter is evidenced for Polygon's deployed CoW settlement. */
export function cowApiUrl(chainId: number): string | undefined {
  return chainId === 137 ? 'https://api.cow.fi/polygon' : undefined
}

export function cowTradesFromReceipt(
  receipt: Pick<TransactionReceipt, 'logs'>,
  chainId: number
): CowTradeExecution[] {
  if (!cowApiUrl(chainId)) return []
  return (receipt.logs ?? []).flatMap((log) => {
    if (log.address.toLowerCase() !== SETTLEMENT || !Number.isSafeInteger(log.logIndex)) return []
    try {
      const { args } = decodeEventLog({
        abi: tradeAbi,
        eventName: 'Trade',
        data: log.data,
        topics: log.topics
      })
      if (!uid.safeParse(args.orderUid).success) return []
      return [
        {
          orderUid: args.orderUid.toLowerCase(),
          owner: args.owner.toLowerCase(),
          sellToken: args.sellToken.toLowerCase(),
          buyToken: args.buyToken.toLowerCase(),
          sellAmount: args.sellAmount.toString(),
          buyAmount: args.buyAmount.toString(),
          logIndex: log.logIndex!
        }
      ]
    } catch {
      return []
    }
  })
}

export function matchesCowOrder(order: CowOrder, trade: CowTradeExecution, safe: string): boolean {
  return (
    order.uid === trade.orderUid &&
    order.owner === safe.toLowerCase() &&
    trade.owner === order.owner &&
    (!order.receiver || order.receiver === order.owner) &&
    order.settlementContract === SETTLEMENT &&
    order.sellToken === trade.sellToken &&
    order.buyToken === trade.buyToken
  )
}

const unavailable = (reason: string): SwapFeeVerification => ({
  fees: null,
  protocolFees: [],
  reason
})

/** Settlement fills owned by the Safe, the only ones that can carry its fees. */
export function safeCowTrades(target: SwapFeeTarget, execution?: SwapExecution) {
  return (execution?.cowTrades ?? []).filter((trade) => trade.owner === target.safeAddress)
}

/** Sum the base units of each `side:token` pair. */
function totalsOf(pairs: readonly (readonly [string, string])[]): Map<string, bigint> {
  const totals = new Map<string, bigint>()
  for (const [key, amount] of pairs) totals.set(key, (totals.get(key) ?? 0n) + BigInt(amount))
  return totals
}

/** The provider fill that reproduces one receipt Trade log exactly, if there is only one. */
function matchedTrade(
  log: CowTradeExecution,
  execution: SwapExecution,
  trades: readonly CowTrade[]
): CowTrade | undefined {
  const hash = execution.transactionHash.toLowerCase()
  const matches = trades.filter(
    (trade) =>
      trade.orderUid === log.orderUid && trade.txHash === hash && trade.logIndex === log.logIndex
  )
  const trade = matches[0]
  return matches.length === 1 &&
    trade!.blockNumber.toString() === execution.blockNumber &&
    trade!.owner === log.owner &&
    trade!.sellToken === log.sellToken &&
    trade!.buyToken === log.buyToken &&
    trade!.sellAmount === log.sellAmount &&
    trade!.buyAmount === log.buyAmount
    ? trade
    : undefined
}

/**
 * An order total is usable only when every fill belongs to this exact confirmed settlement
 * and the fills reproduce the Safe token movements; nothing is inferred otherwise.
 */
export function verifyCowFees(
  target: SwapFeeTarget,
  execution: SwapExecution | undefined,
  orders: readonly CowOrder[],
  trades: readonly CowTrade[]
): SwapFeeVerification {
  const logs = safeCowTrades(target, execution)
  if (!execution || !logs.length)
    return unavailable('Swap fees are unavailable for this provider or network.')
  const movements = totalsOf(
    target.assets.map((asset) => [`${asset.side}:${asset.address}`, asset.rawAmount] as const)
  )
  const executed = totalsOf(
    logs.flatMap((log) => [
      [`spent:${log.sellToken}`, log.sellAmount] as const,
      [`received:${log.buyToken}`, log.buyAmount] as const
    ])
  )
  if (
    movements.size !== executed.size ||
    [...movements].some(([key, amount]) => executed.get(key) !== amount)
  )
    return unavailable('Fee records do not match the Safe token movements.')
  const matched: CowTrade[] = []
  for (const log of logs) {
    const trade = matchedTrade(log, execution, trades)
    if (!trade || !orders.some((order) => matchesCowOrder(order, log, target.safeAddress)))
      return unavailable('Fee records could not be matched to the confirmed swap.')
    matched.push(trade)
  }
  const protocolFees = matched.flatMap((trade) =>
    (trade.executedProtocolFees ?? []).map((fee) => ({
      tokenAddress: fee.token,
      rawAmount: fee.amount,
      policy: fee.policy
    }))
  )
  const fees = new Map<string, bigint>()
  for (const orderUid of new Set(logs.map((log) => log.orderUid))) {
    const order = orders.find((order) => order.uid === orderUid)!
    const fills = trades.filter((trade) => trade.orderUid === orderUid)
    const own = matched.filter((trade) => trade.orderUid === orderUid)
    if (
      fills.length !== own.length ||
      fills.some((trade) => trade.txHash !== execution.transactionHash.toLowerCase()) ||
      own.reduce((sum, trade) => sum + BigInt(trade.sellAmount), 0n) !==
        BigInt(order.executedSellAmount) ||
      own.reduce((sum, trade) => sum + BigInt(trade.buyAmount), 0n) !==
        BigInt(order.executedBuyAmount) ||
      order.executedFee === undefined ||
      !order.executedFeeToken
    )
      return {
        fees: null,
        protocolFees,
        reason: 'The provider total also covers other fills. Only this swap’s breakdown is shown.'
      }
    fees.set(
      order.executedFeeToken,
      (fees.get(order.executedFeeToken) ?? 0n) + BigInt(order.executedFee)
    )
  }
  return {
    fees: [...fees].map(([tokenAddress, amount]) => ({
      tokenAddress,
      rawAmount: amount.toString()
    })),
    protocolFees,
    ...(matched.some((trade) => trade.executedProtocolFees === undefined)
      ? { reason: 'The fee breakdown is unavailable.' }
      : {})
  }
}
