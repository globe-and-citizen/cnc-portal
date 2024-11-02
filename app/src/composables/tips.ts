import { TipsService } from '@/services/tipsService'
import type { ContractTransaction } from 'ethers'
import { ref } from 'vue'

const tipsService = new TipsService()

export function useTipsBalance() {
  const balance = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

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

export function useWithdrawTips() {
  const transaction = ref<ContractTransaction>()
  const loading = ref(false)
  const error = ref<unknown>(null)
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
