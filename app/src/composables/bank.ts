import { BankService } from '@/services/bankService'
import type { BankEventType, EventResult } from '@/types'
import type { IContractReadFunction, IContractTransactionFunction } from '@/types/interfaces'
import dayjs from 'dayjs'
import type { Log } from 'ethers'
import type { EventLog } from 'ethers'
import { ref } from 'vue'

const bankService = new BankService()

export function useDeployBankContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function deploy(teamId: string) {
    try {
      loading.value = true
      contractAddress.value = await bankService.createBankContract(teamId)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deploy, isLoading: loading, isSuccess, error, contractAddress }
}

export function useBankBalance(): IContractReadFunction<string | null> {
  const balance = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)

  async function getBalance(address: string) {
    try {
      loading.value = true
      balance.value = (await bankService.web3Library.getBalance(address)).toString()
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getBalance, isLoading: loading, error, data: balance }
}

export function useBankDeposit(): IContractTransactionFunction {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function deposit(bankAddress: string, amount: string) {
    try {
      loading.value = true
      transaction.value = await bankService.deposit(bankAddress, amount)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deposit, isLoading: loading, isSuccess, error, transaction }
}

export function useBankTransfer(): IContractTransactionFunction {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function transfer(bankAddress: string, to: string, amount: string) {
    try {
      loading.value = true
      transaction.value = await bankService.transfer(bankAddress, to, amount)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: transfer, isLoading: loading, isSuccess, error, transaction }
}

export function useBankEvents(bankAddress: string) {
  const events = ref<EventResult[]>([])
  const loading = ref(false)
  const error = ref<any>(null)

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
