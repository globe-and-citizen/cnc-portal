import { computed, reactive, ref, unref, watch, type MaybeRef } from 'vue'
import { encodeFunctionData, parseEther } from 'viem'
import { TX_SERVICE_BY_CHAIN } from '@/composables/Safe/read'
import { useSafe } from '@/composables/useSafe'
import { useContractInteraction, type ParsedFunction } from '@/composables/Safe/useContractWrite'
import { ABI_MAP, ABI_OPTIONS, type AbiName } from '~/constant/abi'
import { getChainId } from '~/constant/index'

type FunctionArg = { name: string, type: string, value: string }

export function useSafeContractInteraction(options?: {
  abiMap?: Record<AbiName | string, readonly unknown[]>
  safeAddress?: MaybeRef<string | undefined>
}) {
  const chainId = getChainId()
  const { getDeployerInfo, loadSafe } = useSafe()

  const safeAddressRef = computed(() => unref(options?.safeAddress))
  const connectedAddress = ref<string | null>(null)

  async function refreshConnectedAddress() {
    try {
      const info = await getDeployerInfo()
      connectedAddress.value = info.address
    } catch {
      connectedAddress.value = null
    }
  }

  const {
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
  } = useContractInteraction(options?.abiMap ?? ABI_MAP)

  const abiOptions = ABI_OPTIONS
  const selectedAbiOption = computed({
    get: () => abiOptions.find(option => option.value === selectedAbiName.value),
    set: (option) => {
      selectedAbiName.value = (option as { value?: AbiName } | null)?.value ?? null
    }
  })

  const readOptions = computed(() =>
    readFunctions.value.map(fn => ({ label: fn.display, value: fn.key }))
  )
  const selectedReadOption = computed({
    get: () => readOptions.value.find(option => option.value === selectedReadKey.value),
    set: (option) => {
      selectedReadKey.value = (option as { value?: string } | null)?.value ?? null
    }
  })

  const writeOptions = computed(() =>
    writeFunctions.value.map(fn => ({ label: fn.display, value: fn.key }))
  )
  const selectedWriteOption = computed({
    get: () => writeOptions.value.find(option => option.value === selectedWriteKey.value),
    set: (option) => {
      selectedWriteKey.value = (option as { value?: string } | null)?.value ?? null
    }
  })

  const selectedReadFunction = computed<ParsedFunction | null>(() =>
    readFunctions.value.find(fn => fn.key === selectedReadKey.value) || null
  )
  const selectedWriteFunction = computed<ParsedFunction | null>(() =>
    writeFunctions.value.find(fn => fn.key === selectedWriteKey.value) || null
  )

  const readArgs = reactive<FunctionArg[]>([])
  const writeArgs = reactive<FunctionArg[]>([])
  const payableValue = ref('0')

  const isReading = ref(false)
  const readError = ref<string | null>(null)
  const readResult = ref<string | null>(null)

  const isProposing = ref(false)
  const writeError = ref<string | null>(null)
  const writeSuccess = ref<string | null>(null)

  watch(selectedAbiName, v => loadAbi(v))

  watch(selectedReadFunction, (fn) => {
    resetArgs(readArgs, fn)
    readError.value = null
    readResult.value = null
  })

  watch(selectedWriteFunction, (fn) => {
    resetArgs(writeArgs, fn)
    writeError.value = null
    writeSuccess.value = null
    payableValue.value = '0'
  })

  function resetArgs(target: FunctionArg[], fn: ParsedFunction | null) {
    target.splice(0, target.length)
    if (!fn) return
    fn.inputs.forEach((input, idx) => {
      target.push({ name: input.name || `arg${idx}`, type: input.type, value: '' })
    })
  }

  const placeholderForType = (type: string) => {
    if (type.includes('[]') || type.startsWith('tuple')) return 'Use JSON (e.g. ["0x...",1])'
    if (type.startsWith('bytes')) return '0x...'
    if (type.startsWith('uint') || type.startsWith('int')) return 'Number / string'
    if (type === 'bool') return 'true / false'
    return 'Value'
  }

  function parseArgValue(raw: string, type: string): unknown {
    if (type === 'bool') return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on'
    if (type === 'address') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) throw new Error(`Invalid address for parameter (${raw})`)
      return raw
    }
    if (type.startsWith('bytes')) {
      if (!raw.startsWith('0x')) throw new Error('Bytes parameter must be hex prefixed with 0x')
      return raw
    }
    if (type.includes('[') || type.startsWith('tuple')) {
      try {
        return JSON.parse(raw)
      } catch {
        throw new Error('Arrays/tuples require JSON input (e.g. ["0x...",1])')
      }
    }
    if (type.startsWith('uint') || type.startsWith('int')) {
      if (raw === '' || raw === null || raw === undefined) return '0'
      return raw.toString()
    }
    return raw
  }

  async function onCallReadFunction() {
    if (!selectedReadFunction.value) return
    readError.value = null
    readResult.value = null
    try {
      await ensureContractHasCode()
      const args = selectedReadFunction.value.inputs.map((input, idx) =>
        parseArgValue(readArgs[idx]?.value || '', input.type)
      )
      isReading.value = true
      const decoded = await callReadFunction(selectedReadFunction.value, args)
      readResult.value = typeof decoded === 'object'
        ? JSON.stringify(decoded, null, 2)
        : String(decoded ?? '')
    } catch (err: unknown) {
      readError.value = err instanceof Error ? err.message : 'Failed to call function'
    } finally {
      isReading.value = false
    }
  }

  async function proposeWriteTransaction() {
    if (!selectedWriteFunction.value) return
    writeError.value = null
    writeSuccess.value = null
    isProposing.value = true
    try {
      await ensureContractHasCode()
      if (!connectedAddress.value) {
        await refreshConnectedAddress()
      }
      if (!connectedAddress.value) throw new Error('Connect your wallet first')
      const txService = TX_SERVICE_BY_CHAIN[chainId]
      if (!txService) throw new Error(`Unsupported chainId: ${chainId}`)

      const args = selectedWriteFunction.value.inputs.map((input, idx) =>
        parseArgValue(writeArgs[idx]?.value || '', input.type)
      )

      const rawPayableValue = payableValue.value?.trim() || '0'
      const value = selectedWriteFunction.value.payable ? parseEther(rawPayableValue) : 0n
      const data = encodeFunctionData({
        abi: abi.value,
        functionName: selectedWriteFunction.value.key,
        args
      })

      const safeAddress = safeAddressRef.value
      if (!safeAddress) throw new Error('Missing Safe address')
      const safeSdk = await loadSafe(safeAddress)
      const safeTransaction = await safeSdk.createTransaction({
        transactions: [{
          to: contractAddress.value as `0x${string}`,
          data,
          value: value.toString(),
          operation: 0
        }]
      })
      const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
      const senderSignature = await safeSdk.signHash(safeTxHash)
      const txData = safeTransaction.data

      const resp = await fetch(`${txService.url}/api/v1/safes/${safeAddress}/multisig-transactions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: txData.to,
          value: txData.value,
          data: txData.data || '0x',
          operation: txData.operation,
          safeTxGas: txData.safeTxGas,
          baseGas: txData.baseGas,
          gasPrice: txData.gasPrice,
          gasToken: txData.gasToken,
          refundReceiver: txData.refundReceiver,
          nonce: txData.nonce,
          contractTransactionHash: safeTxHash,
          sender: connectedAddress.value,
          signature: senderSignature.data,
          origin: 'cnc-dashboard'
        })
      })
      if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(errorText || 'Failed to propose transaction')
      }
      writeSuccess.value = safeTxHash
    } catch (err: unknown) {
      writeError.value = err instanceof Error ? err.message : 'Failed to propose transaction'
    } finally {
      isProposing.value = false
    }
  }

  return {
    abiOptions,
    selectedAbiOption,
    selectedAbiName,
    readOptions,
    selectedReadOption,
    writeOptions,
    selectedWriteOption,
    selectedReadFunction,
    selectedWriteFunction,
    readFunctions,
    writeFunctions,
    functions,
    functionsLoaded,
    loadError,
    contractAddress,
    readArgs,
    writeArgs,
    payableValue,
    isReading,
    readError,
    readResult,
    onCallReadFunction,
    isProposing,
    writeError,
    writeSuccess,
    proposeWriteTransaction,
    placeholderForType,
    connectedAddress,
    refreshConnectedAddress
  }
}
