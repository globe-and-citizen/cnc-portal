import type { ContractTransaction } from 'ethers'
import type { Ref } from 'vue'

export interface IContractTransactionFunction {
  isLoading: Ref<boolean>
  isSuccess: Ref<boolean>
  error: Ref<any>
  transaction: Ref<ContractTransaction | undefined>
  execute: (...args: any[]) => Promise<void>
}
