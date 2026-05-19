import { type Address, encodeFunctionData, erc20Abi, parseEther, parseUnits } from 'viem'
import { getTxServiceUrl } from './safe'
import { type ProposeTransactionParams } from '@/types/safe'
import { type ProposeTransactionBody } from '@/types/safe.mutation'
import externalApiClient from '@/lib/external.axios.ts'

/**
 * Post a transaction proposal to the Safe Transaction Service
 */
async function postTransactionProposal(params: ProposeTransactionParams): Promise<void> {
  const { chainId, safeAddress, safeTxHash, transactionData, sender, signature, origin } = params
  const txServiceUrl = getTxServiceUrl(chainId)

  const body: ProposeTransactionBody = {
    ...transactionData,
    contractTransactionHash: safeTxHash,
    sender,
    signature,
    origin: origin || null
  }

  await externalApiClient.post(
    `${txServiceUrl}/api/v1/safes/${safeAddress}/multisig-transactions/`,
    body
  )
}

/**
 * Extract transaction hash from Safe transaction response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTransactionHash(txResponse: any): string {
  const hash = txResponse.transactionResponse?.hash || txResponse.hash
  if (!hash) {
    throw new Error('Transaction hash not found in response')
  }
  return hash
}

/**
 * Wait for transaction confirmation if wait function is available
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function waitForTransaction(txResponse: any): Promise<void> {
  const waitFn = txResponse.transactionResponse?.wait

  if (typeof waitFn === 'function') {
    await waitFn()
  }
}

/**
 * Build Safe token transfer transaction data
 */
export function buildTokenTransferData(params: {
  to: string
  amount: string
  tokenAddress: string | null
  tokenId: string
}): {
  to: string
  value: string
  data: string
  operation: number
} {
  const { to, amount, tokenAddress, tokenId } = params

  if (tokenAddress) {
    return {
      to: tokenAddress,
      value: '0',
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [
          to as Address,
          tokenId === 'usdc' || tokenId === 'usdt' || tokenId === 'usdc.e'
            ? parseUnits(amount, 6)
            : parseEther(amount)
        ]
      }),
      operation: 0
    }
  }

  return {
    to,
    value: parseEther(amount).toString(),
    data: '0x',
    operation: 0
  }
}

/**
 * Propose or execute Safe transaction based on threshold
 */
export async function proposeOrExecuteSafeTransaction(params: {
  safeSdk: Awaited<ReturnType<typeof import('@safe-global/protocol-kit').default.init>>
  transactionData: Array<{ to: string; value: string; data: string; operation: number }>
  shouldPropose: boolean
  chainId: number
  safeAddress: string
  signer: Address
}): Promise<string> {
  const { safeSdk, transactionData, shouldPropose, chainId, safeAddress, signer } = params
  const { ZERO_ADDRESS } = await import('@/utils/safe')

  if (shouldPropose) {
    const safeTransaction = await safeSdk.createTransaction({ transactions: transactionData })
    const safeTxHash = await safeSdk.getTransactionHash(safeTransaction)
    const signature = await safeSdk.signHash(safeTxHash)

    await postTransactionProposal({
      chainId,
      safeAddress,
      safeTxHash,
      transactionData: {
        to: safeTransaction.data.to,
        value: safeTransaction.data.value,
        data: safeTransaction.data.data,
        operation: safeTransaction.data.operation || 0,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: ZERO_ADDRESS,
        refundReceiver: ZERO_ADDRESS,
        nonce: await safeSdk.getNonce()
      },
      sender: signer,
      signature: signature.data,
      origin: window.location.origin
    })

    return safeTxHash
  }

  const safeTransaction = await safeSdk.createTransaction({ transactions: transactionData })
  const txResponse = await safeSdk.executeTransaction(safeTransaction)
  const txHash = extractTransactionHash(txResponse)
  await waitForTransaction(txResponse)

  return txHash
}
