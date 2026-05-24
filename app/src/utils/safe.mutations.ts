import { type Address, encodeFunctionData, erc20Abi, parseEther, parseUnits, zeroAddress } from 'viem'
import type { TransactionResult } from '@safe-global/types-kit'
import { getTxServiceUrl } from './safe'
import { type ProposeTransactionParams } from '@/types/safe'
import type {
  BuildOwnerManagementTransactionsParams,
  ProposeTransactionBody,
  SafeSdkInstance,
  SafeTransactionInput
} from '@/types/safe.mutation'
import type { TokenId } from '@/constant'
import { getTokenDecimals } from './constantUtil'
import externalApiClient from '@/lib/external.axios.ts'

type SafeTransactionResponseLike = {
  hash?: string
  wait?: () => Promise<unknown>
}

function getTransactionResponse(
  txResponse: TransactionResult
): SafeTransactionResponseLike | undefined {
  const candidate = txResponse.transactionResponse
  if (!candidate || typeof candidate !== 'object') {
    return undefined
  }

  const maybeResponse = candidate as {
    hash?: unknown
    wait?: unknown
  }

  return {
    hash: typeof maybeResponse.hash === 'string' ? maybeResponse.hash : undefined,
    wait:
      typeof maybeResponse.wait === 'function'
        ? (maybeResponse.wait as () => Promise<unknown>)
        : undefined
  }
}

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
export function extractTransactionHash(txResponse: TransactionResult): string {
  const transactionResponse = getTransactionResponse(txResponse)
  const rootHash = typeof txResponse.hash === 'string' ? txResponse.hash : undefined
  const hash = transactionResponse?.hash || rootHash
  if (!hash) {
    throw new Error('Transaction hash not found in response')
  }
  return hash
}

/**
 * Wait for transaction confirmation if wait function is available
 */
export async function waitForTransaction(txResponse: TransactionResult): Promise<void> {
  const waitFn = getTransactionResponse(txResponse)?.wait

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
  tokenId: TokenId
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
        args: [to as Address, parseUnits(amount, getTokenDecimals(tokenId))]
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
 * Build Safe owner-management transaction data from requested operations.
 */
export async function buildOwnerManagementTransactions(
  params: BuildOwnerManagementTransactionsParams
): Promise<SafeTransactionInput[]> {
  const { safeSdk, ownersToAdd, ownersToRemove, newThreshold, currentThreshold } = params
  const transactionData: SafeTransactionInput[] = []

  for (const owner of ownersToAdd) {
    const safeTx = await safeSdk.createAddOwnerTx({
      ownerAddress: owner as Address,
      threshold: newThreshold
    })
    transactionData.push({
      to: safeTx.data.to,
      value: safeTx.data.value,
      data: safeTx.data.data,
      operation: safeTx.data.operation || 0
    })
  }

  for (const owner of ownersToRemove) {
    const safeTx = await safeSdk.createRemoveOwnerTx({
      ownerAddress: owner as Address,
      threshold: newThreshold || currentThreshold
    })
    transactionData.push({
      to: safeTx.data.to,
      value: safeTx.data.value,
      data: safeTx.data.data,
      operation: safeTx.data.operation || 0
    })
  }

  if (ownersToAdd.length === 0 && ownersToRemove.length === 0 && newThreshold !== undefined) {
    const safeTx = await safeSdk.createChangeThresholdTx(newThreshold)
    transactionData.push({
      to: safeTx.data.to,
      value: safeTx.data.value,
      data: safeTx.data.data,
      operation: safeTx.data.operation || 0
    })
  }

  return transactionData
}

/**
 * Propose a Safe transaction through the transaction service.
 */
export async function proposeSafeTransaction(params: {
  safeSdk: SafeSdkInstance
  transactionData: SafeTransactionInput[]
  chainId: number
  safeAddress: string
  signer: Address
}): Promise<string> {
  const { safeSdk, transactionData, chainId, safeAddress, signer } = params
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
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: await safeSdk.getNonce()
    },
    sender: signer,
    signature: signature.data,
    origin: window.location.origin
  })

  return safeTxHash
}

/**
 * Execute a Safe transaction on-chain.
 */
export async function executeSafeTransaction(params: {
  safeSdk: SafeSdkInstance
  transactionData: SafeTransactionInput[]
}): Promise<string> {
  const { safeSdk, transactionData } = params
  const safeTransaction = await safeSdk.createTransaction({ transactions: transactionData })
  const txResponse = await safeSdk.executeTransaction(safeTransaction)
  const txHash = extractTransactionHash(txResponse)
  await waitForTransaction(txResponse)

  return txHash
}
