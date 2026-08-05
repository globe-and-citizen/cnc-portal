import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { isAddress, type Abi, type AbiFunction, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { formatDecodedValue } from '@/utils/abiDecodeUtil'
import { formatContractFunctionLabel } from '@/utils/contractPresentation'

export interface ContractReadDatum {
  functionName: string
  label: string
  value: string
  outputType: string
  isAddress: boolean
}

export interface ContractReadData {
  fields: ContractReadDatum[]
  failedCount: number
  totalCount: number
}

export const contractReadDataKeys = {
  all: ['contract-read-data'] as const,
  detail: (address: Address | undefined, contractType: string) =>
    [...contractReadDataKeys.all, { address, contractType }] as const
}

const readableFunctions = (abi: Abi): AbiFunction[] =>
  abi.filter(
    (item): item is AbiFunction =>
      item.type === 'function' &&
      ['view', 'pure'].includes(item.stateMutability) &&
      item.inputs.length === 0
  )

export async function readContractData(address: Address, abi: Abi): Promise<ContractReadData> {
  const functions = readableFunctions(abi)
  const settledReads = await Promise.allSettled(
    functions.map(async (abiFunction): Promise<ContractReadDatum> => {
      const rawValue = await readContract(config, {
        address,
        abi,
        functionName: abiFunction.name
      })
      const outputType =
        abiFunction.outputs.length === 1 ? (abiFunction.outputs[0]?.type ?? 'unknown') : 'tuple'
      const formatted = formatDecodedValue(outputType, rawValue)

      return {
        functionName: abiFunction.name,
        label: formatContractFunctionLabel(abiFunction.name),
        value: formatted.display,
        outputType,
        isAddress: formatted.isAddress
      }
    })
  )
  const fields = settledReads.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : []
  )
  const failedCount = settledReads.length - fields.length

  if (functions.length && !fields.length) {
    throw new Error('Contract data could not be loaded')
  }

  return { fields, failedCount, totalCount: functions.length }
}

export function useContractReadData(options: {
  address: MaybeRefOrGetter<Address | undefined>
  abi: MaybeRefOrGetter<Abi>
  contractType: MaybeRefOrGetter<string>
  enabled: MaybeRefOrGetter<boolean>
}) {
  const address = computed(() => toValue(options.address))
  const abi = computed(() => toValue(options.abi))
  const contractType = computed(() => toValue(options.contractType))

  return useQuery({
    queryKey: computed(() => contractReadDataKeys.detail(address.value, contractType.value)),
    queryFn: () => readContractData(address.value!, abi.value),
    enabled: computed(
      () => toValue(options.enabled) && !!address.value && isAddress(address.value)
    ),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false
  })
}
