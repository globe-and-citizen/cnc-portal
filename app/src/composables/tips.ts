import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { TipsService } from '@/services/tipsService'
import type { EventResult, TipsEventType } from '@/types'
import dayjs from 'dayjs'
import type { Log } from 'ethers'
import type { EventLog } from 'ethers'
import type { Ref } from 'vue'
import { ref } from 'vue'

const tipsService = new TipsService(EthersJsAdapter.getInstance())

interface IContractReadFunction<T> {
  isLoading: Ref<boolean>
  error: Ref<any>
  data: Ref<T>
  execute: () => Promise<void>
}

interface IContractTransactionFunction {
  isLoading: Ref<boolean>
  isSuccess: Ref<boolean>
  error: Ref<any>
  transaction: Ref<any>
  execute: (...args: any[]) => Promise<void>
}

export function useTipsBalance(): IContractReadFunction<string | null> {
  const balance = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)

  async function getBalance() {
    try {
      loading.value = true
      balance.value = tipsService.web3Library.formatEther(await tipsService.getBalance()).toString()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  async function execute() {
    await getBalance()
  }

  return { isLoading: loading, error, data: balance, execute }
}

export function usePushTip(): IContractTransactionFunction {
  const transaction = ref<any>(null)
  const isLoading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function pushTip(addresses: string[], amount: number) {
    try {
      isLoading.value = true
      transaction.value = await tipsService.pushTip(addresses, amount)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      isLoading.value = false
    }
  }

  return { execute: pushTip, isLoading, error, isSuccess, transaction }
}

export function useSendTip(): IContractTransactionFunction {
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

  return { execute: sendTip, isLoading: loading, error, isSuccess, transaction }
}

export function useWithdrawTips(): IContractTransactionFunction {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function withdraw() {
    try {
      loading.value = true
      transaction.value = await tipsService.withdrawTips()
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: withdraw, isLoading: loading, isSuccess, error, transaction }
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
