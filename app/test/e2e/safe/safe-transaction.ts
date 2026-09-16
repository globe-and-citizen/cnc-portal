import { zeroAddress, type Address } from 'viem'
import type { SafeTransaction } from '../../../src/types/safe'
import { E2E_MEMBER, E2E_NEW_SIGNER } from '../e2e-chain'

/** A pending Safe Transaction Service entry, as the stubbed service returns it. */
export const transaction = (
  safe: Address,
  overrides: Partial<SafeTransaction> = {}
): SafeTransaction => ({
  safe,
  to: E2E_NEW_SIGNER,
  value: '0',
  data: '0x',
  operation: 0,
  safeTxGas: '0',
  baseGas: '0',
  gasPrice: '0',
  gasToken: zeroAddress,
  refundReceiver: zeroAddress,
  nonce: 0,
  executionDate: null,
  submissionDate: '2026-01-01T00:00:00Z',
  modified: '2026-01-01T00:00:00Z',
  blockNumber: null,
  transactionHash: null,
  safeTxHash: `0x${'a'.repeat(64)}`,
  proposer: E2E_MEMBER,
  executor: null,
  isExecuted: false,
  isSuccessful: null,
  confirmationsRequired: 1,
  confirmations: [],
  dataDecoded: null,
  ...overrides
})
