import { computed, unref, type MaybeRef } from 'vue'
import type { Address, Hash, Hex } from 'viem'
import { useContractWrites } from '@/composables/contracts/useContractWritesV2'
import { useTeamStore } from '@/stores'
import { CASH_REMUNERATION_EIP712_ABI } from '@/artifacts/abi/cash-remuneration-eip712'
import type { ExtractAbiFunctionNames } from 'abitype'

type CashRemunerationFunctionNames = ExtractAbiFunctionNames<typeof CASH_REMUNERATION_EIP712_ABI>

export interface CashRemunerationWage {
  hourlyRate: bigint
  tokenAddress: Address
}

export interface CashRemunerationWageClaim {
  employeeAddress: Address
  hoursWorked: number
  wages: readonly CashRemunerationWage[]
  date: bigint
}

export function useCashRemunerationContractWrite(options: {
  functionName: CashRemunerationFunctionNames
  args?: MaybeRef<readonly unknown[]>
  value?: MaybeRef<bigint>
}) {
  const teamStore = useTeamStore()
  const contractAddress = computed(() =>
    teamStore.getContractAddressByType('CashRemunerationEIP712')
  )

  return useContractWrites({
    contractAddress,
    abi: CASH_REMUNERATION_EIP712_ABI,
    functionName: options.functionName,
    args: options.args ?? [],
    ...(options.value !== undefined ? { value: options.value } : {})
  })
}

export function useCashRemunerationAddTokenSupport(tokenAddress: MaybeRef<Address>) {
  const write = useCashRemunerationContractWrite({
    functionName: 'addTokenSupport',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([unref(tokenAddress)] as readonly unknown[])
  }
}

export function useCashRemunerationRemoveTokenSupport(tokenAddress: MaybeRef<Address>) {
  const write = useCashRemunerationContractWrite({
    functionName: 'removeTokenSupport',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([unref(tokenAddress)] as readonly unknown[])
  }
}

export function useCashRemunerationDisableClaim(signatureHash: MaybeRef<Hash>) {
  const write = useCashRemunerationContractWrite({
    functionName: 'disableClaim',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([unref(signatureHash)] as readonly unknown[])
  }
}

export function useCashRemunerationEnableClaim(signatureHash: MaybeRef<Hash>) {
  const write = useCashRemunerationContractWrite({
    functionName: 'enableClaim',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([unref(signatureHash)] as readonly unknown[])
  }
}

export function useCashRemunerationInitialize(
  owner: MaybeRef<Address>,
  tokenAddresses: MaybeRef<readonly Address[]>
) {
  const write = useCashRemunerationContractWrite({
    functionName: 'initialize',
    args: []
  })

  return {
    ...write,
    executeWrite: () =>
      write.executeWrite([unref(owner), unref(tokenAddresses)] as readonly unknown[])
  }
}

export function useCashRemunerationSetOfficerAddress(officerAddress: MaybeRef<Address>) {
  const write = useCashRemunerationContractWrite({
    functionName: 'setOfficerAddress',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([unref(officerAddress)] as readonly unknown[])
  }
}

export function useCashRemunerationOwnerWithdrawNative(amount: MaybeRef<bigint>) {
  const write = useCashRemunerationContractWrite({
    functionName: 'ownerWithdrawNative',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([unref(amount)] as readonly unknown[])
  }
}

export function useCashRemunerationOwnerWithdrawToken(
  tokenAddress: MaybeRef<Address>,
  amount: MaybeRef<bigint>
) {
  const write = useCashRemunerationContractWrite({
    functionName: 'ownerWithdrawToken',
    args: []
  })

  return {
    ...write,
    executeWrite: () =>
      write.executeWrite([unref(tokenAddress), unref(amount)] as readonly unknown[])
  }
}

export function useCashRemunerationWithdraw(
  wageClaim: MaybeRef<CashRemunerationWageClaim>,
  signature: MaybeRef<Hex>
) {
  const write = useCashRemunerationContractWrite({
    functionName: 'withdraw',
    args: []
  })

  return {
    ...write,
    executeWrite: () =>
      write.executeWrite([unref(wageClaim), unref(signature)] as readonly unknown[])
  }
}

export function useCashRemunerationTransferOwnership(newOwner: MaybeRef<Address>) {
  const write = useCashRemunerationContractWrite({
    functionName: 'transferOwnership',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([unref(newOwner)] as readonly unknown[])
  }
}

export function useCashRemunerationRenounceOwnership() {
  const write = useCashRemunerationContractWrite({
    functionName: 'renounceOwnership',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([])
  }
}

export function useCashRemunerationPause() {
  const write = useCashRemunerationContractWrite({
    functionName: 'pause',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([])
  }
}

export function useCashRemunerationUnpause() {
  const write = useCashRemunerationContractWrite({
    functionName: 'unpause',
    args: []
  })

  return {
    ...write,
    executeWrite: () => write.executeWrite([])
  }
}
