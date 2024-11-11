import { ExpenseAccountService } from '@/services/expenseAccountService'
import { ref } from 'vue'
import { log, parseError } from '@/utils'
import { EthersJsAdapter } from '@/adapters/web3LibraryAdapter'

const expenseAccountService = new ExpenseAccountService()
const ethers = EthersJsAdapter.getInstance()

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
