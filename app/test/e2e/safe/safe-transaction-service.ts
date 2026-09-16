// In-page stand-in for the Safe Transaction Service. Safe info is read from
// the real E2E chain; proposals and confirmations live in memory per test.
import type { Page, Request } from '@playwright/test'
import { parseEther, parseUnits, type Address } from 'viem'
import { E2E_SAFE_TX_SERVICE_URL } from '../../../src/e2e/chain'
import type {
  SafeConfirmation,
  SafeIncomingTransfer,
  SafeTransaction
} from '../../../src/types/safe'
import { E2E_OWNER } from '../e2e-chain'
import { json, type E2EUser, type StubResponse } from '../e2e-page'
import { safeNonce, safeOwners, safeThreshold, type SafeE2EFixture } from './safe-chain'

export interface SafeTransactionServiceOptions {
  incomingTransfers?: SafeIncomingTransfer[]
  transactions?: SafeTransaction[]
  user: E2EUser
}

interface ProposalBody {
  contractTransactionHash: string
  to: string
  value: string
  data: string
  operation: number
  safeTxGas: string
  baseGas: string
  gasPrice: string
  gasToken: string
  refundReceiver: string
  nonce: number
  signature: string
}

const SAFE_PATH = /\/safes\/(0x[a-fA-F0-9]{40})\//
const PROPOSED_AT = '2026-01-01T00:00:00Z'
const CONFIRMED_AT = '2026-01-01T00:00:30Z'
const EXECUTED_AT = '2026-01-01T00:01:00Z'

const notFound = (message: string): StubResponse => ({
  status: 404,
  contentType: 'text/plain',
  body: message
})

const sameAddress = (left: string, right: string | undefined) =>
  left.toLowerCase() === right?.toLowerCase()

function initialIncomingTransfers(fixture: SafeE2EFixture): SafeIncomingTransfer[] {
  return [
    {
      type: 'ETHER_TRANSFER',
      executionDate: '2026-01-01T00:00:00Z',
      blockNumber: 1,
      transactionHash: `0x${'1'.repeat(64)}`,
      to: fixture.safe,
      from: E2E_OWNER,
      value: parseEther('1').toString()
    },
    {
      type: 'ERC20_TRANSFER',
      executionDate: '2026-01-01T00:00:01Z',
      blockNumber: 2,
      transactionHash: `0x${'2'.repeat(64)}`,
      to: fixture.safe,
      from: E2E_OWNER,
      value: parseUnits('2', 6).toString(),
      tokenAddress: fixture.usdc,
      tokenInfo: {
        type: 'ERC20',
        address: fixture.usdc,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6
      }
    }
  ]
}

const confirmationFor = (user: E2EUser, signature: string): SafeConfirmation => ({
  owner: user.address,
  submissionDate: PROPOSED_AT,
  transactionHash: null,
  signature,
  signatureType: 'ETH_SIGN'
})

async function currentSafeInfo(address: Address) {
  const [owners, threshold, nonce] = await Promise.all([
    safeOwners(address),
    safeThreshold(address),
    safeNonce(address)
  ])
  return {
    address,
    chain: 'hardhat',
    balance: '0',
    symbol: 'GO',
    owners,
    threshold,
    nonce,
    version: '1.4.1'
  }
}

/** Once the Safe nonce moves past a proposal, the real service reports it executed. */
async function markExecutedTransactions(transactions: SafeTransaction[], safeAddress: Address) {
  const nonce = await safeNonce(safeAddress)
  for (const transaction of transactions) {
    const executed = transaction.nonce >= 0 && transaction.nonce < nonce
    if (!sameAddress(transaction.safe, safeAddress) || transaction.isExecuted || !executed) continue
    transaction.isExecuted = true
    transaction.isSuccessful = true
    transaction.executionDate = EXECUTED_AT
    transaction.modified = EXECUTED_AT
  }
}

function proposedTransaction(
  safeAddress: Address,
  body: ProposalBody,
  threshold: number,
  user: E2EUser
): SafeTransaction {
  const { contractTransactionHash, signature, ...transaction } = body
  return {
    safe: safeAddress,
    ...transaction,
    executionDate: null,
    submissionDate: PROPOSED_AT,
    modified: PROPOSED_AT,
    blockNumber: null,
    transactionHash: null,
    safeTxHash: contractTransactionHash,
    proposer: user.address,
    executor: null,
    isExecuted: false,
    isSuccessful: null,
    confirmationsRequired: threshold,
    confirmations: [confirmationFor(user, signature)],
    dataDecoded: null
  }
}

export async function stubSafeTransactionService(
  page: Page,
  fixture: SafeE2EFixture,
  options: SafeTransactionServiceOptions
): Promise<void> {
  const transactions = structuredClone(options.transactions ?? [])
  const incomingTransfers = options.incomingTransfers ?? initialIncomingTransfers(fixture)

  const respond = async (request: Request): Promise<StubResponse> => {
    const { pathname } = new URL(request.url())
    const method = request.method()
    const safeAddress = pathname.match(SAFE_PATH)?.[1] as Address | undefined

    // Confirmations are keyed by Safe transaction hash, not by Safe address.
    if (method === 'POST' && pathname.endsWith('/confirmations/')) {
      const safeTxHash = pathname.split('/').filter(Boolean).at(-2)
      const transaction = transactions.find((item) => item.safeTxHash === safeTxHash)
      const { signature } = request.postDataJSON() as { signature?: string }
      if (transaction && signature) {
        transaction.confirmations.push(confirmationFor(options.user, signature))
        transaction.modified = CONFIRMED_AT
      }
      return json({}, 201)
    }
    if (method === 'GET' && pathname.includes('/multisig-transactions')) {
      if (safeAddress) await markExecutedTransactions(transactions, safeAddress)
      const results = transactions.filter((transaction) =>
        sameAddress(transaction.safe, safeAddress)
      )
      return json({ next: null, results })
    }
    if (!safeAddress) return notFound('Safe address missing')

    if (method === 'GET' && pathname.endsWith(`/safes/${safeAddress}/`)) {
      return json(await currentSafeInfo(safeAddress))
    }
    if (method === 'GET' && pathname.endsWith('/incoming-transfers/')) {
      const results = incomingTransfers.filter((transfer) => sameAddress(transfer.to, safeAddress))
      return json({ next: null, results })
    }
    if (method === 'POST' && pathname.endsWith('/multisig-transactions/')) {
      const { threshold } = await currentSafeInfo(safeAddress)
      const body = request.postDataJSON() as ProposalBody
      transactions.push(proposedTransaction(safeAddress, body, threshold, options.user))
      return json({}, 201)
    }
    return notFound('Unexpected Safe Transaction Service request')
  }

  await page.route(`${E2E_SAFE_TX_SERVICE_URL}/**`, async (route) =>
    route.fulfill(await respond(route.request()))
  )
}
