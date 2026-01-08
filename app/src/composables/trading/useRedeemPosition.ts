// composables/useRedeemSafeTransaction.ts
import { computed, markRaw, ref, watch } from 'vue'
import Safe, { type Eip1193Provider } from '@safe-global/protocol-kit'
import SafeApiKit from '@safe-global/api-kit'
import { useConnectorClient } from '@wagmi/vue'
import { clientToSigner } from '@/utils'
import { useUserDataStore } from '@/stores'
import { createRedeemTx } from '@/utils/trading/redeemUtil'

export function useRedeemPosition() {
  const isProposing = ref(false)
  const error = ref<Error | null>(null)
  const isReady = ref(false)
  const userDataStore = useUserDataStore()
  const { data: client } = useConnectorClient()
  const API_KEY = import.meta.env.VITE_APP_SAFE_API_KEY

  const ethersSigner = computed(() => {
    if (!client.value) return null
    const signer = clientToSigner(client.value)
    return markRaw(signer)
  })

  watch([ethersSigner, () => userDataStore.address], ([newSigner, newAddress]) => {
    if (newSigner && newAddress) {
      isReady.value = true
    } else {
      isReady.value = false
    }
  })

  /**
   * @param signer - The Ethers JsonRpcSigner from the browser wallet
   * @param safeAddress - The Polymarket Safe address
   * @param redeemTxData - The encoded transaction data (from your createRedeemTx util)
   * @param ctfContractAddress - The Polymarket CTF contract address
   */
  const proposeRedemption = async (params: {
    safeAddress: string
    conditionId: string
    outcomeIndex: number
  }) => {
    isProposing.value = true
    error.value = null

    try {
      if (!ethersSigner.value) {
        throw new Error('Wallet not connected or ready')
      }
      // 1. Initialize Protocol Kit with the browser signer
      // Safe SDK accepts Ethers Signer directly as the provider/signer
      const protocolKit = await Safe.init({
        provider: window.ethereum as string | Eip1193Provider, // or your specific provider
        signer: await ethersSigner.value.getAddress(),
        safeAddress: params.safeAddress
      })

      // 2. Initialize API Kit (Polygon Chain ID is 137)
      const apiKit = new SafeApiKit({
        chainId: BigInt(137),
        apiKey: API_KEY
      })

      // 3. Define the Transaction Data
      const safeTransactionData = createRedeemTx({
        conditionId: params.conditionId,
        outcomeIndex: params.outcomeIndex
      })

      // 4. Create Safe Transaction
      const safeTransaction = await protocolKit.createTransaction({
        transactions: [safeTransactionData]
      })

      // 5. Get Hash and Sign
      const safeTxHash = await protocolKit.getTransactionHash(safeTransaction)
      const signature = await protocolKit.signHash(safeTxHash)

      console.log('Safe Address: ', params.safeAddress)

      // 6. Propose to Transaction Service
      await apiKit.proposeTransaction({
        safeAddress: params.safeAddress,
        safeTransactionData: safeTransaction.data,
        safeTxHash,
        senderAddress: await ethersSigner.value.getAddress(),
        senderSignature: signature.data
      })

      return { success: true, safeTxHash }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Proposal failed')
      console.error('Safe Proposal Error:', err)
      throw error.value
    } finally {
      isProposing.value = false
    }
  }

  return {
    proposeRedemption,
    isProposing,
    error
  }
}
