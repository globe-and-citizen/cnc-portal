import { ExpenseAccountService } from '@/services/expenseAccountService'
import { ref } from 'vue'
import { log, parseError } from '@/utils'
import { TransactionResponse } from 'ethers'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'

const expenseAccountService = new ExpenseAccountService()
const ethers = EthersJsAdapter.getInstance()

export function useExpenseAccountTransferOwnership(expenseAccountAddress: string) {
  const data = ref<TransactionResponse | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function transferExpenseOwnership(newOwner: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.transferOwnership(expenseAccountAddress, newOwner)
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: transferExpenseOwnership, isLoading: loading, isSuccess, error, data }
}

export function useExpenseAccountGetMaxLimit() {
  const data = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function getMaxLimit(expenseAccountAddress: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.getMaxLimit(expenseAccountAddress)
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getMaxLimit, isLoading: loading, isSuccess, error, data }
}

export function useExpenseAccountApproveAddress() {
  const data = ref<unknown | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function approveAddress(expenseAccountAddress: string, userAddress: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.approveAddress(expenseAccountAddress, userAddress)
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: approveAddress, isLoading: loading, isSuccess, error, data }
}

export function useExpenseAccountDisapproveAddress() {
  const data = ref<unknown | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function disapproveAddress(expenseAccountAddress: string, userAddress: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.disapproveAddress(expenseAccountAddress, userAddress)
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: disapproveAddress, isLoading: loading, isSuccess, error, data }
}

export function useExpenseAccountSetLimit() {
  const data = ref<unknown | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function setLimit(expenseAccountAddress: string, amount: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.setMaxLimit(expenseAccountAddress, amount)
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: setLimit, isLoading: loading, isSuccess, error, data }
}

export function useExpenseAccountTransfer() {
  const data = ref<unknown | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function transfer(expenseAccountAddress: string, to: string, amount: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.transfer(expenseAccountAddress, to, Number(amount))
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: transfer, isLoading: loading, isSuccess, error, data }
}

export function useExpenseAccountIsApprovedAddress() {
  const data = ref<boolean>(false)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function isApprovedAddress(expenseAccountAddress: string, userAddress: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.isApprovedAddress(expenseAccountAddress, userAddress)
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: isApprovedAddress, isLoading: loading, isSuccess, error, data }
}

export function useDeployExpenseAccountContract() {
  const data = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function deploy() {
    try {
      loading.value = true
      data.value = await expenseAccountService.createExpenseAccountContract()
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deploy, isLoading: loading, isSuccess, error, data }
}

export function useExpenseAccountGetOwner() {
  const data = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function getOwner(address: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.getOwner(address)
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getOwner, isLoading: loading, isSuccess, error, data }
}

export function useExpenseAccountGetBalance() {
  const data = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function getBalance(address: string) {
    try {
      loading.value = true
      data.value = await expenseAccountService.getBalance(address)
      isSuccess.value = true
    } catch (err) {
      log.error(parseError(err))
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getBalance, isLoading: loading, isSuccess, error, data }
}

export function useExpenseGetFunction(expenseAccountAddress: string) {
  const functionName = ref<string | undefined>()
  const inputs = ref<string[] | undefined>([])
  const args = ref<string[] | undefined>([])

  async function getFunction(data: string) {
    try {
      const expense = await expenseAccountService.getContract(expenseAccountAddress)
      const func = expense.interface.parseTransaction({ data })
      functionName.value = func?.name
      inputs.value = func?.fragment.inputs.map((input) => input.name)
      args.value = func?.args.map((arg) => {
        return typeof arg === 'bigint' ? ethers.formatEther(arg) : arg.toString()
      })
    } catch (err) {
      log.error(parseError(err))
    }
  }

  return { execute: getFunction, data: functionName, args, inputs }
}
