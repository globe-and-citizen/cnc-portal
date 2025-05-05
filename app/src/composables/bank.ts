import { log, parseError } from '@/utils'
import { config } from '@/wagmi.config'
import { decodeFunctionData, getContract, type Address } from 'viem'
import { ref } from 'vue'
import BankABI from '@/artifacts/abi/bank.json'

export function useBankGetFunction(bankAddress: string) {
  const functionName = ref<string | undefined>()
  const inputs = ref<string[] | undefined>([])
  const args = ref<string[] | undefined>([])

  async function getFunction(data: string): Promise<void> {
    try {
      const bank = getContract({
        client: config.getClient(),
        address: bankAddress as Address,
        abi: BankABI
      })
      const func = decodeFunctionData({
        abi: BankABI,
        data: data as Address
      })

      functionName.value = func.functionName
      args.value = func.args as string[]
      inputs.value = bank.abi
        .find((item) => item.name === func.functionName)
        ?.inputs?.map((input) => input.name) as string[]
    } catch (error) {
      log.error(parseError(error))
    }
  }

  return { execute: getFunction, data: functionName, inputs, args }
}
