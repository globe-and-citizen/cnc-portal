import { computed, type ComputedRef } from 'vue'
import type { Abi } from 'viem'
import type { ContractType } from '@/types'
import { getAbi } from '@/artifacts/registry'
import { useContractVersion } from './useContractVersion'

/**
 * The ABI for a per-team contract, selected for the CURRENT team's version.
 *
 * Drop-in replacement for a static `XXX_ABI` import at call sites that pair an
 * ABI with a per-team address (`teamStore.getContractAddressByType(...)`). Pass
 * the returned ref straight to `useReadContract` / `useContractWritesV3` — both
 * accept a reactive `abi`.
 */
export function useContractAbi(type: ContractType): ComputedRef<Abi> {
  const version = useContractVersion()
  return computed(() => getAbi(type, version.value))
}
