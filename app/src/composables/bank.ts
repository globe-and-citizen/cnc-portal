import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'
import { BankService } from '@/services/bankService'
import type { BankEventType, EventResult } from '@/types'
import { log, parseError } from '@/utils'
import dayjs from 'dayjs'
import type { Log } from 'ethers'
import type { EventLog } from 'ethers'
import { ref } from 'vue'

const bankService = new BankService()
const ethers = EthersJsAdapter.getInstance()

export function useBankEvents(bankAddress: string) {
  const events = ref<EventResult[]>([])
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function getEvents(type: BankEventType): Promise<void> {
    try {
      loading.value = true
      const response = await bankService.getEvents(bankAddress, type)
      events.value = await Promise.all(
        response.map(async (eventData: EventLog | Log) => {
          const date = dayjs((await eventData.getBlock()).date).format('DD/MM/YYYY HH:mm')

          return {
            txHash: eventData.transactionHash,
            date: date,
            data: (await bankService.getContract(bankAddress)).interface.decodeEventLog(
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

export function useBankGetFunction(bankAddress: string) {
  const functionName = ref<string | undefined>()
  const inputs = ref<string[] | undefined>([])
  const args = ref<string[] | undefined>([])

  async function getFunction(data: string): Promise<void> {
    try {
      const bank = await bankService.getContract(bankAddress)
      const func = bank.interface.parseTransaction({ data })
      functionName.value = func?.name
      inputs.value = func?.fragment.inputs.map((input) => input.name)
      args.value = func?.args.map((arg) => {
        return typeof arg === 'bigint' ? ethers.formatEther(arg) : arg.toString()
      })
    } catch (error) {
      log.error(parseError(error))
    }
  }

  return { execute: getFunction, data: functionName, inputs, args }
}
