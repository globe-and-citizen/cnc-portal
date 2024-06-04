import type { Ref } from 'vue'

export interface IContractTransactionFunction {
  isLoading: Ref<boolean>
  isSuccess: Ref<boolean>
  error: Ref<any>
  transaction: Ref<any>
  execute: (...args: any[]) => Promise<void>
}
