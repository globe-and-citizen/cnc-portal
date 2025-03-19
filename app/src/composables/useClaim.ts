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

export function useWithdrawClaim() {
  const isLoading = ref(false)
  const isSuccess = ref(false)
  const toastStore = useToastStore()
  const teamStore = useTeamStore()
  const claimURL = ref('')
  const userStore = useUserDataStore()
  const claimBody = ref({})
  const {
    data: claim,
    error: claimError,
    execute: fetchClaim
  } = useCustomFetch(claimURL, {
    immediate: false
  })
    .get()
    .json<ClaimResponse>()
  const {
    writeContractAsync: withdraw,
    data: withdrawHash,
    error: withdrawError
  } = useWriteContract()
  const { isSuccess: withdrawSuccess, error: withdrawTrxError } = useWaitForTransactionReceipt({
    hash: withdrawHash
  })
  const { execute: updateClaimStatus } = useCustomFetch(claimURL, {
    immediate: false
  })
    .put(claimBody)
    .json()

  const execute = async (claimId: number) => {
    isLoading.value = true
    isSuccess.value = false
    claimURL.value = `/teams/${claimId}/cash-remuneration/claim`

    await fetchClaim()

    const balance = formatEther(
      await getBalance(config.getClient(), {
        address: teamStore.currentTeam?.cashRemunerationEip712Address as Address
      })
    )
    if (Number(balance) < Number(claim.value!.hourlyRate) * claim.value!.hoursWorked) {
      isLoading.value = false
      toastStore.addErrorToast('Insufficient balance')
      return
    }

    await withdraw({
      abi: EIP712ABI,
      address: teamStore.currentTeam?.cashRemunerationEip712Address as Address,
      functionName: 'withdraw',
      args: [
        {
          hourlyRate: parseEther(claim.value!.hourlyRate),
          hoursWorked: claim.value!.hoursWorked,
          employeeAddress: userStore.address as Address,
          date: BigInt(Math.floor(new Date(claim.value!.createdAt).getTime() / 1000))
        },
        claim.value!.cashRemunerationSignature
      ]
    })

    claimURL.value = `/teams/${teamStore.currentTeam!.id}/cash-remuneration/claim/employee`
    claimBody.value = { claimid: claimId }
  }

  watch(withdrawSuccess, async (value) => {
    if (value) {
      await updateClaimStatus()
      isLoading.value = false
      isSuccess.value = true
      toastStore.addSuccessToast('Claim withdrawn')
    }
  })

  watch(withdrawError, (error) => {
    if (error) {
      log.error(parseError(error))
      isLoading.value = false
      toastStore.addErrorToast('Failed to withdraw claim')
    }
  })

  watch(claimError, (error) => {
    if (error) {
      log.error(parseError(error))
      isLoading.value = false
      toastStore.addErrorToast('Failed to fetch claim')
    }
  })

  watch(withdrawTrxError, (error) => {
    if (error) {
      log.error(parseError(error))
      isLoading.value = false
      toastStore.addErrorToast('Failed to withdraw claim')
    }
  })

  return {
    execute,
    isLoading,
    isSuccess
  }
}
