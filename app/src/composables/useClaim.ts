import { useToastStore, useUserDataStore } from '@/stores'
import { useTeamStore } from '@/stores/teamStore'
import type { ClaimResponse } from '@/types'
import { log, parseError } from '@/utils'
import {
  useChainId,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract
} from '@wagmi/vue'
import { formatEther, parseEther, type Address } from 'viem'
import { ref, watch } from 'vue'
import EIP712ABI from '@/artifacts/abi/CashRemunerationEIP712.json'
import { useCustomFetch } from './useCustomFetch'
import { getBalance } from 'viem/actions'
import { config } from '@/wagmi.config'

export function useSignWageClaim() {
  const isLoading = ref(false)
  const { signTypedDataAsync, data: signature } = useSignTypedData()
  const teamStore = useTeamStore()
  const toastStore = useToastStore()
  // const userStore = useUserDataStore()
  const chainId = useChainId()

  const execute = async (claim: ClaimResponse) => {
    isLoading.value = true

    try {
      await signTypedDataAsync({
        domain: {
          name: 'CashRemuneration',
          version: '1',
          chainId: chainId.value,
          verifyingContract: teamStore.currentTeam?.cashRemunerationEip712Address as Address
        },
        types: {
          WageClaim: [
            { name: 'employeeAddress', type: 'address' },
            { name: 'hoursWorked', type: 'uint8' },
            { name: 'hourlyRate', type: 'uint256' },
            { name: 'date', type: 'uint256' }
          ]
        },
        message: {
          hourlyRate: parseEther(String(claim.wage.cashRatePerHour)),
          hoursWorked: claim.hoursWorked,
          employeeAddress: claim.wage.userAddress as Address,
          date: BigInt(Math.floor(new Date(claim.createdAt).getTime() / 1000))
        },
        primaryType: 'WageClaim'
      })
    } catch (err) {
      log.error(parseError(err))
      toastStore.addErrorToast('Failed to sign claim')
    } finally {
      isLoading.value = false
    }
  }

  return {
    execute,
    isLoading,
    signature
  }
}
