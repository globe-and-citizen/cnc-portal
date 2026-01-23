import { ref, type ComputedRef } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { Side, OrderType } from '@polymarket/clob-client'
import type { ClobClient, UserOrder } from '@polymarket/clob-client'
import { log } from '@/utils'

export type OrderParams = {
  tokenId: string
  size: number
  price?: number
  side: 'BUY' | 'SELL'
  negRisk?: boolean
  isMarketOrder?: boolean
}

export function useClobOrder(
  clobClient: ComputedRef<ClobClient | null>,
  walletAddress: string | undefined
) {
  const isSubmitting = ref(false)
  const error = ref<Error | null>(null)
  const orderId = ref<string | null>(null)
  const queryClient = useQueryClient()

  const submitOrder = async (params: OrderParams) => {
    if (!walletAddress) throw new Error('Wallet not connected')
    if (!clobClient.value) throw new Error('CLOB client not initialized')

    isSubmitting.value = true
    error.value = null
    orderId.value = null

    try {
      const side = params.side === 'BUY' ? Side.BUY : Side.SELL
      let response

      if (params.isMarketOrder) {
        let aggressivePrice: number
        try {
          const priceFromOrderbook = await clobClient.value.getPrice(params.tokenId, side)
          const marketPrice = parseFloat(priceFromOrderbook.price)

          if (isNaN(marketPrice) || marketPrice <= 0 || marketPrice >= 1) {
            throw new Error('Invalid price from orderbook')
          }

          aggressivePrice =
            params.side === 'BUY'
              ? Math.min(0.99, marketPrice * 1.05)
              : Math.max(0.01, marketPrice * 0.95)
        } catch (e) {
          log.info('aggressivePrice error: ', e)
          aggressivePrice = params.side === 'BUY' ? 0.99 : 0.01
        }

        const marketOrder: UserOrder = {
          tokenID: params.tokenId,
          price: aggressivePrice,
          size: params.size,
          side,
          feeRateBps: 0,
          expiration: 0,
          taker: '0x0000000000000000000000000000000000000000'
        }

        response = await clobClient.value.createAndPostOrder(
          marketOrder,
          { negRisk: params.negRisk },
          OrderType.GTC
        )
      } else {
        if (!params.price) throw new Error('Price required for limit orders')

        const limitOrder: UserOrder = {
          tokenID: params.tokenId,
          price: params.price,
          size: params.size,
          side,
          feeRateBps: 0,
          expiration: 0,
          taker: '0x0000000000000000000000000000000000000000'
        }

        response = await clobClient.value.createAndPostOrder(
          limitOrder,
          { negRisk: params.negRisk },
          OrderType.GTC
        )
      }

      if (response.orderID) {
        orderId.value = response.orderID
        queryClient.invalidateQueries({ queryKey: ['active-orders'] })
        queryClient.invalidateQueries({ queryKey: ['polymarket-positions'] })
        return { success: true, orderId: response.orderID }
      } else {
        throw new Error('Order submission failed')
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to submit order')
      error.value = e
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  const cancelOrder = async (targetOrderId: string) => {
    if (!clobClient.value) throw new Error('CLOB client not initialized')

    isSubmitting.value = true
    error.value = null

    try {
      await clobClient.value.cancelOrder({ orderID: targetOrderId })
      queryClient.invalidateQueries({ queryKey: ['active-orders'] })
      return { success: true }
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to cancel order')
      error.value = e
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    submitOrder,
    cancelOrder,
    isSubmitting,
    error,
    orderId
  }
}
