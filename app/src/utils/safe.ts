import type { Eip1193Provider } from '@safe-global/protocol-kit'
import type { Address } from 'viem'
import type { SafeMultisigConfirmationResponse, SignatureType } from '@safe-global/types-kit'
import { CHAIN_NAMES } from '@/types/safe'
import {
  type SafeConfirmation,
  type SafeMultisigTransactionResponse,
  type SafeTransaction
} from '@/types/safe'
/**
 * Get injected EIP-1193 provider with proper type checking
 */
export function getInjectedProvider(): Eip1193Provider {
  const provider = (globalThis.window as Window & typeof globalThis)?.ethereum

  if (!provider) {
    throw new Error('No injected Ethereum provider found')
  }

  // Type guard to ensure provider implements EIP-1193
  if (typeof (provider as { request?: unknown }).request !== 'function') {
    throw new Error('Injected provider does not implement EIP-1193 request method')
  }

  return provider as Eip1193Provider
}

/**
 * Generate random salt nonce for Safe deployment
 */
export function randomSaltNonce(): string {
  return `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`
}

/**
 * Generate Safe app URLs (move from useSafeAppUrls composable)
 */
export function getSafeHomeUrl(chainId: number, safeAddress: Address): string {
  const chainName = CHAIN_NAMES[chainId] || 'ethereum'
  return `https://app.safe.global/home?safe=${chainName}:${safeAddress}`
}

export function getSafeSettingsUrl(chainId: number, safeAddress: string): string {
  const chainName = CHAIN_NAMES[chainId] || 'ethereum'
  return `https://app.safe.global/settings/setup?safe=${chainName}:${safeAddress}`
}

export function openSafeAppUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function transformToSafeMultisigResponse(
  transaction: SafeTransaction
): SafeMultisigTransactionResponse {
  const normalizeConfirmation = (
    confirmation: SafeConfirmation
  ): SafeMultisigConfirmationResponse => ({
    owner: confirmation.owner,
    submissionDate: confirmation.submissionDate,
    transactionHash: confirmation.transactionHash ?? undefined,
    confirmationType: (confirmation as { confirmationType?: string }).confirmationType,
    signature: confirmation.signature,
    signatureType: confirmation.signatureType as SignatureType
  })

  return {
    safe: transaction.safe,
    to: transaction.to,
    value: transaction.value,
    data: transaction.data ?? undefined,
    operation: transaction.operation,
    gasToken: transaction.gasToken,
    safeTxGas: transaction.safeTxGas?.toString() || '0',
    baseGas: transaction.baseGas?.toString() || '0',
    gasPrice: transaction.gasPrice?.toString() || '0',
    refundReceiver: transaction.refundReceiver ?? undefined,
    nonce: transaction.nonce.toString(),
    executionDate: transaction.executionDate ?? null,
    submissionDate: transaction.submissionDate,
    modified: transaction.modified,
    blockNumber: transaction.blockNumber ?? null,
    transactionHash: transaction.transactionHash ?? null,
    safeTxHash: transaction.safeTxHash,
    proposer: transaction.proposer ?? null,
    proposedByDelegate:
      typeof transaction.proposedByDelegate === 'string'
        ? transaction.proposedByDelegate
        : transaction.proposedByDelegate
          ? (transaction.proposer ?? transaction.executor ?? null)
          : null,
    executor: transaction.executor ?? null,
    isExecuted: transaction.isExecuted,
    isSuccessful: transaction.isSuccessful ?? null,
    ethGasPrice: transaction.ethGasPrice ?? null,
    maxFeePerGas: transaction.maxFeePerGas ?? null,
    maxPriorityFeePerGas: transaction.maxPriorityFeePerGas ?? null,
    gasUsed: transaction.gasUsed ?? null,
    fee: transaction.fee ?? null,
    origin: transaction.origin ?? '',
    dataDecoded: transaction.dataDecoded ?? undefined,
    confirmationsRequired: transaction.confirmationsRequired,
    confirmations: transaction.confirmations?.map(normalizeConfirmation),
    trusted: transaction.trusted ?? true,
    signatures: transaction.signatures ?? null
  }
}
