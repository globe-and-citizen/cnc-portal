import { BankService } from '@/services/bankService'
import type { BankEventType, EventResult } from '@/types'
import dayjs from 'dayjs'
import type { Log } from 'ethers'
import type { TransactionResponse } from 'ethers'
import type { EventLog } from 'ethers'
import { ref } from 'vue'

const bankService = new BankService()

export function useDeployBankContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
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

export function useBankBalance() {
  const balance = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

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

export function useBankDeposit() {
  const transaction = ref<TransactionResponse>()
  const loading = ref(false)
  const error = ref<unknown>(null)
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

export function useBankTransfer() {
  const transaction = ref<TransactionResponse>()
  const loading = ref(false)
  const error = ref<unknown>(null)
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

export function useBankStatus(bankAddress: string): IContractReadFunction<boolean | null> {
  const isPaused = ref<boolean | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<any>(null)

  async function getIsPaused(): Promise<void> {
    try {
      loading.value = true
      isPaused.value = await bankService.isPaused(bankAddress)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { data: isPaused, execute: getIsPaused, isLoading: loading, error }
}

export function useBankOwner(bankAddress: string): IContractReadFunction<string | null> {
  const owner = ref<string | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<any>(null)

  async function getOwner(): Promise<void> {
    try {
      loading.value = true
      owner.value = await bankService.getOwner(bankAddress)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { data: owner, execute: getOwner, isLoading: loading, error }
}

export function useBankPause(bankAddress: string): IContractTransactionFunction {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function pause(): Promise<void> {
    try {
      loading.value = true
      transaction.value = await bankService.pause(bankAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: pause, isLoading: loading, isSuccess, error, transaction }
}

export function useBankUnpause(bankAddress: string): IContractTransactionFunction {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function unpause(): Promise<void> {
    try {
      loading.value = true
      transaction.value = await bankService.unpause(bankAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: unpause, isLoading: loading, isSuccess, error, transaction }
}

export function useBankTransferOwnership(bankAddress: string): IContractTransactionFunction {
  const transaction = ref<any>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function transferOwnership(newOwner: string): Promise<void> {
    try {
      loading.value = true
      transaction.value = await bankService.transferOwnership(bankAddress, newOwner)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: transferOwnership, isLoading: loading, isSuccess, error, transaction }
}
