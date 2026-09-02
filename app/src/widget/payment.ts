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
import { describeWidgetError } from './errorMessage'
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
  try {
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
  } catch (error) {
    throw new Error(describeWidgetError(error))
  }
}

async function ensureAllowance(params: {
  owner: Address
  spender: Address
  token: Address
  amount: bigint
}): Promise<void> {
  const { owner, spender, token, amount } = params

  try {
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
  } catch (error) {
    throw new Error(describeWidgetError(error))
  }
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
  try {
    await call(widgetWagmiConfig, {
      account,
      to: params.bankAddress,
      data,
      chainId: widgetChain.id
    })
  } catch (error) {
    onStatus?.('failed')
    throw new Error(describeWidgetError(error))
  }

  let hash: Hex
  try {
    hash = await sendTransaction(widgetWagmiConfig, {
      account,
      to: params.bankAddress,
      data,
      chainId: widgetChain.id
    })
  } catch (error) {
    onStatus?.('failed')
    throw new Error(describeWidgetError(error))
  }

  const receipt = await waitForTransactionReceipt(widgetWagmiConfig, {
    hash,
    chainId: widgetChain.id
  })

  if (receipt.status !== 'success') {
    onStatus?.('failed')
    throw new Error(await describeFailedReceipt({ account, to: params.bankAddress, data }, receipt))
  }

  onStatus?.('success')
  return { hash }
}

/**
 * The receipt itself carries no revert reason — only `waitForTransactionReceipt`
 * ran without an ABI, same as the preflight `call` above. Replay the same raw
 * call one block earlier (mirrors `useContractWritesV3`'s simulate-replay) to
 * recover a decodable reason. Best-effort: the replay can itself fail to
 * reproduce the revert (state moved on again since), in which case a plain
 * "reverted on-chain" message is all there is to show.
 */
async function describeFailedReceipt(
  request: { account: Address; to: Address; data: Hex },
  receipt: Awaited<ReturnType<typeof waitForTransactionReceipt>>
): Promise<string> {
  if (!receipt.blockNumber || receipt.blockNumber === 0n) return 'Payment failed on-chain.'
  try {
    await call(widgetWagmiConfig, {
      ...request,
      chainId: widgetChain.id,
      blockNumber: receipt.blockNumber - 1n
    })
  } catch (error) {
    return describeWidgetError(error)
  }
  return 'Payment failed on-chain.'
}
