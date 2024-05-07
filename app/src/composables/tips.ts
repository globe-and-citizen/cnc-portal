import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { TipsService } from '@/services/tipsService'
import type { EventResult, TipsEventType } from '@/types'
import dayjs from 'dayjs'
import type { EventLog } from 'ethers'
import { ref, type Ref } from 'vue'

export function useTips() {
  const tipsService = new TipsService(EthersJsAdapter.getInstance())
  const balance = ref('0')
  const pushTipLoading = ref(false)
  const sendTipLoading = ref(false)
  const balanceLoading = ref(false)

  async function getBalance() {
    balanceLoading.value = true

    balance.value = await tipsService.getBalance()

    balanceLoading.value = false
  }

  async function withdraw() {
    await tipsService.withdrawTips()
    await getBalance()
  }

  async function pushTip(addresses: string[], amount: number): Promise<void> {
    pushTipLoading.value = true

    await tipsService.pushTip(addresses, amount)
    await getBalance()

    pushTipLoading.value = false
  }

  async function sendTip(addresses: string[], amount: number): Promise<void> {
    sendTipLoading.value = true

    await tipsService.sendTip(addresses, amount)
    await getBalance()

    sendTipLoading.value = false
  }

  async function getEvents(type: TipsEventType, loading: Ref<boolean>): Promise<EventResult[]> {
    loading.value = true

    const events = await tipsService.getEvents(type)

    const result = await Promise.all(
      events.map(async (eventData: EventLog) => {
        const date = dayjs((await eventData.getBlock()).date).format('DD/MM/YYYY HH:mm')

        return {
          txHash: eventData.transactionHash,
          date: date,
          data: tipsService.contract.interface.decodeEventLog(
            type,
            eventData.data,
            eventData.topics
          )
        }
      })
    )

    loading.value = false

    return result
  }

  return {
    balance,
    pushTipLoading,
    sendTipLoading,
    balanceLoading,
    getBalance,
    withdraw,
    pushTip,
    sendTip,
    getEvents
  }
}
