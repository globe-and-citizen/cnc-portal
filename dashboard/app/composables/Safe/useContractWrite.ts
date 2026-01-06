import { ref, computed } from 'vue'
import { encodeFunctionData, decodeFunctionResult, publicActions, type Abi, type AbiFunction } from 'viem'
import { useClient } from '@wagmi/vue'

export interface ParsedFunction {
  key: string
  display: string
  inputs: AbiFunction['inputs']
  stateMutability: AbiFunction['stateMutability']
  payable: boolean
}

export function useContractInteraction(abiMap: Record<string, readonly unknown[]>) {
  const client = useClient()
  const publicClient = computed(() => client.value?.extend(publicActions))
  const contractAddress = ref('')

  const abi = ref<Abi>([]) // viem Abi type
  const functions = ref<ParsedFunction[]>([])
  const loadError = ref<string | null>(null)

  const selectedAbiName = ref<string | null>(null)
  const selectedReadKey = ref<string | null>(null)
  const selectedWriteKey = ref<string | null>(null)

  const functionsLoaded = computed(() => functions.value.length > 0)
  const readFunctions = computed(() =>
    functions.value.filter(fn => fn.stateMutability === 'view' || fn.stateMutability === 'pure')
  )
  const writeFunctions = computed(() =>
    functions.value.filter(fn => fn.stateMutability === 'payable' || fn.stateMutability === 'nonpayable')
  )

  function loadAbi(abiName: string | null) {
    loadError.value = null
    functions.value = []
    abi.value = []
    selectedReadKey.value = null
    selectedWriteKey.value = null
    if (!abiName) return
    try {
      abi.value = abiMap[abiName] as Abi
      const parsedFunctions: ParsedFunction[] = (abi.value as Abi)
        .filter((item): item is AbiFunction => item.type === 'function')
        .map(item => ({
          key: item.name,
          display: `${item.name} (${item.stateMutability})`,
          inputs: item.inputs,
          stateMutability: item.stateMutability,
          payable: item.stateMutability === 'payable'
        }))
      functions.value = parsedFunctions
      selectedReadKey.value = readFunctions.value[0]?.key || null
      selectedWriteKey.value = writeFunctions.value[0]?.key || null
    } catch (error: unknown) {
      loadError.value = error instanceof Error ? error.message : 'Invalid ABI'
      functions.value = []
      abi.value = []
    }
  }

  async function ensureContractHasCode() {
    const rpcClient = publicClient.value
    if (!rpcClient) {
      throw new Error('Public client is not available')
    }
    if (!contractAddress.value || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress.value)) {
      throw new Error('Enter a valid contract address')
    }
    const code = await rpcClient.getBytecode({ address: contractAddress.value as `0x${string}` })
    if (!code) {
      throw new Error('No contract code found at this address on the configured RPC. Check the address and network.')
    }
  }

  async function callReadFunction(fn: ParsedFunction, args: unknown[]) {
    const rpcClient = publicClient.value
    if (!rpcClient) {
      throw new Error('Public client is not available')
    }
    await ensureContractHasCode()
    const data = encodeFunctionData({
      abi: abi.value,
      functionName: fn.key,
      args
    })
    const { data: resultData } = await rpcClient.call({
      to: contractAddress.value as `0x${string}`,
      data
    })
    if (!resultData) {
      throw new Error('No data returned from contract call')
    }
    const decoded = decodeFunctionResult({
      abi: abi.value,
      functionName: fn.key,
      data: resultData
    })
    return decoded
  }

  return {
    contractAddress,
    abi,
    functions,
    loadError,
    selectedAbiName,
    selectedReadKey,
    selectedWriteKey,
    functionsLoaded,
    readFunctions,
    writeFunctions,
    loadAbi,
    callReadFunction,
    ensureContractHasCode
  }
}
