/**
 * Widget payment flow: connect wallet -> switch chain -> ERC-20 approve (if
 * needed) -> submit `depositToken` with the facture ID appended to calldata
 * -> wait for the receipt. Mirrors `DepositBankForm.vue`'s approve/deposit
 * sequence and `useContractWritesV3`'s simulate -> write -> wait shape, but
 * built on raw `@wagmi/core` actions: the custom facture-id calldata isn't a
 * plain ABI-encoded call, so it can't go through `useContractWritesV3` (which
 * only ever encodes `abi`/`functionName`/`args`) or through `writeContract`
 * (viem's `writeContract` re-derives calldata from the ABI and drops any
 * out-of-band bytes — only `simulateContract`'s preflight honors a raw
 * suffix). `call` + `sendTransaction` operate on raw calldata directly, so
 * the encoded bytes reach the chain unchanged.
 */
import {
  call,
  connect,
  getConnection,
  readContract,
  sendTransaction,
  simulateContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
  type GetConnectionReturnType
} from '@wagmi/core'
import { erc20Abi, type Address, type Hex } from 'viem'
import { encodeDepositTokenWithFactureId } from '@/utils/paymentGate/factureCalldata'
import { widgetChain, widgetWagmiConfig } from './wagmiConfig'

export interface WidgetPaymentParams {
  bankAddress: Address
  tokenAddress: Address
  /** Token amount already scaled to the token's smallest unit. */
  amount: bigint
  factureId: string
}

export type WidgetPaymentStatus = 'connecting' | 'approving' | 'paying' | 'success' | 'failed'

export interface WidgetPaymentResult {
  hash: Hex
}

async function ensureConnected(): Promise<Address> {
  const connector = widgetWagmiConfig.connectors[0]
  let connection: GetConnectionReturnType<typeof widgetWagmiConfig> =
    getConnection(widgetWagmiConfig)

  if (!connection.isConnected) {
    await connect(widgetWagmiConfig, { connector, chainId: widgetChain.id })
    connection = getConnection(widgetWagmiConfig)
  }

  await switchChain(widgetWagmiConfig, { chainId: widgetChain.id })
  connection = getConnection(widgetWagmiConfig)

  if (!connection.address) {
    throw new Error('No active wallet connection after connect/switch')
  }

  return connection.address
}

async function ensureAllowance(params: {
  owner: Address
  spender: Address
  token: Address
  amount: bigint
}): Promise<void> {
  const { owner, spender, token, amount } = params

  const allowance = await readContract(widgetWagmiConfig, {
    address: token,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [owner, spender],
    chainId: widgetChain.id
  })

  if (allowance >= amount) return

  const simulation = await simulateContract(widgetWagmiConfig, {
    address: token,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amount],
    chainId: widgetChain.id
  })
  const approveHash = await writeContract(widgetWagmiConfig, simulation.request)
  await waitForTransactionReceipt(widgetWagmiConfig, {
    hash: approveHash,
    chainId: widgetChain.id
  })
}

/**
 * Runs the full widget payment flow. `onStatus` reports progress so the UI
 * layer can render the Review -> Paying -> Confirmed states.
 */
export async function payWithWidget(
  params: WidgetPaymentParams,
  onStatus?: (status: WidgetPaymentStatus) => void
): Promise<WidgetPaymentResult> {
  onStatus?.('connecting')
  const account = await ensureConnected()

  onStatus?.('approving')
  await ensureAllowance({
    owner: account,
    spender: params.bankAddress,
    token: params.tokenAddress,
    amount: params.amount
  })

  onStatus?.('paying')
  const data = encodeDepositTokenWithFactureId({
    token: params.tokenAddress,
    amount: params.amount,
    factureId: params.factureId
  })

  // Preflight: `call` replays the transaction without submitting it, so a
  // revert (unsupported token, paused Bank, …) surfaces before the wallet
  // prompt rather than after gas is spent.
  await call(widgetWagmiConfig, {
    account,
    to: params.bankAddress,
    data,
    chainId: widgetChain.id
  })

  const hash = await sendTransaction(widgetWagmiConfig, {
    account,
    to: params.bankAddress,
    data,
    chainId: widgetChain.id
  })

  const receipt = await waitForTransactionReceipt(widgetWagmiConfig, {
    hash,
    chainId: widgetChain.id
  })

  if (receipt.status !== 'success') {
    onStatus?.('failed')
    throw new Error('Payment transaction reverted on-chain')
  }

  onStatus?.('success')
  return { hash }
}
