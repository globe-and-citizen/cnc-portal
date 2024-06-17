import type { Ref } from 'vue'

export interface IContractReadFunction<T> {
  isLoading: Ref<boolean>
  error: Ref<any>
  data: Ref<T>
  execute: (...args: any[]) => Promise<void>
}
