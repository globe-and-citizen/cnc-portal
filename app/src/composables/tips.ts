import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { TipsService } from '@/services/tipsService'
import type { EventResult, TipsEventType } from '@/types'
import dayjs from 'dayjs'
import type { Log } from 'ethers'
import type { EventLog } from 'ethers'
import { ref } from 'vue'

const tipsService = new TipsService(EthersJsAdapter.getInstance())

export function useTipsBalance() {
  const balance = ref<string>('0')
  const loading = ref(false)
  const error = ref<any>(null)

  async function getBalance() {
    try {
      loading.value = true
      balance.value = await tipsService.getBalance()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { balance, getBalance, loading, error }
}

export function usePushTip() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function pushTip(addresses: string[], amount: number): Promise<any> {
    try {
      loading.value = true
      transaction.value = await tipsService.pushTip(addresses, amount)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { pushTip, loading, error, isSuccess, transaction }
}

export function useSendTip() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function sendTip(addresses: string[], amount: number): Promise<void> {
    try {
      loading.value = true
      transaction.value = await tipsService.sendTip(addresses, amount)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { sendTip, loading, error, isSuccess, transaction }
}

export function useWithdrawTips() {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)

  async function withdraw() {
    try {
      loading.value = true
      transaction.value = await tipsService.withdrawTips()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { withdraw, loading, error, transaction }
}

export function useTipEvents() {
  const events = ref<EventResult[]>([])
  const loading = ref(false)
  const error = ref<any>(null)

  async function getEvents(type: TipsEventType): Promise<void> {
    try {
      loading.value = true
      const response = await tipsService.getEvents(type)
      events.value = await Promise.all(
        response.map(async (eventData: EventLog | Log) => {
          const date = dayjs((await eventData.getBlock()).date).format('DD/MM/YYYY HH:mm')

          return {
            txHash: eventData.transactionHash,
            date: date,
            data: (await tipsService.getContract()).interface.decodeEventLog(
              type,
              eventData.data,
              eventData.topics
            )
          }
        })
      )
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { events, getEvents, loading, error }
}
