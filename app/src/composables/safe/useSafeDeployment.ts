/**
 * Side-effect contract (see app/src/composables/CONVENTIONS.md):
 *   - onSuccess: no toast — the deploy step is never the user-facing "done"
 *                moment on its own; SafeDeploymentCard.vue always chains
 *                straight into useCreateContractMutation before showing
 *                anything, so the toast stays owned by the caller. Invalidates
 *                safeKeys.info(safeAddress).
 *   - onError:   no toast — `mutation.error` is left for callers to render
 *                inline via UAlert / classifyError.
 */
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { getConnections } from '@wagmi/core'
import { encodeFunctionData, parseEventLogs, zeroAddress, type Address, type Hex } from 'viem'
import { config } from '@/wagmi.config'
import { log } from '@/lib/logging'
import { randomSaltNonce } from '@/lib/safe/browser'
import { executeContractWrite } from '@/composables/contracts/useContractWritesV3'
import { getSafeInfraAddresses } from '@/constant'
import { SAFE_PROXY_FACTORY_ABI } from '@/artifacts/abi/safe-proxy-factory'
import { deploySafeSchema } from '@/types/safe.schemas'
import type { SafeDeploymentParams } from '@/types/safe.mutation'
import { safeKeys } from '@/queries/safe.queries'

const SAFE_SETUP_ABI = [
  {
    type: 'function',
    name: 'setup',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_owners', type: 'address[]' },
      { name: '_threshold', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'fallbackHandler', type: 'address' },
      { name: 'paymentToken', type: 'address' },
      { name: 'payment', type: 'uint256' },
      { name: 'paymentReceiver', type: 'address' }
    ],
    outputs: []
  }
] as const

const PROXY_CREATION_EVENT_ABI = [
  {
    type: 'event',
    name: 'ProxyCreation',
    inputs: [
      { name: 'proxy', type: 'address', indexed: true },
      { name: 'singleton', type: 'address', indexed: false }
    ]
  }
] as const

export type DeploySafeArgs = SafeDeploymentParams

export interface DeploySafeResult {
  hash: Hex
  receipt: unknown
  safeAddress: Address
}

/**
 * Deploys a new Safe by calling SafeProxyFactory.createProxyWithNonce
 * directly through a typed ABI, with the setup() initializer encoded by
 * hand — no Safe SDK involved. Pure async — no Vue state, no toasts, no
 * query invalidation. Call directly for raw control, or use
 * {@link useDeploySafe} to get TanStack-managed state + side effects.
 */
export async function deploySafe(args: DeploySafeArgs): Promise<DeploySafeResult> {
  const connections = getConnections(config)
  const currentConnection = connections.find((c) => c.accounts.length > 0)

  if (!currentConnection) {
    throw new Error('Wallet not connected')
  }

  const { owners, threshold } = deploySafeSchema.parse(args)

  const { singleton, proxyFactory, fallbackHandler } = getSafeInfraAddresses()

  const initializer = encodeFunctionData({
    abi: SAFE_SETUP_ABI,
    functionName: 'setup',
    args: [
      owners,
      BigInt(threshold),
      zeroAddress,
      '0x',
      fallbackHandler,
      zeroAddress,
      0n,
      zeroAddress
    ]
  })

  const saltNonce = BigInt(randomSaltNonce())

  const { hash, receipt } = await executeContractWrite({
    address: proxyFactory,
    abi: SAFE_PROXY_FACTORY_ABI,
    functionName: 'createProxyWithNonce',
    args: [singleton, initializer, saltNonce]
  })

  log.info('Safe deployment confirmed:', { hash, receipt })

  const [event] = parseEventLogs({
    abi: PROXY_CREATION_EVENT_ABI,
    eventName: 'ProxyCreation',
    logs: receipt.logs
  })

  if (!event) {
    throw new Error('Failed to extract Safe proxy address from deployment event')
  }

  const safeAddress = event.args.proxy

  log.info('Safe proxy address extracted:', safeAddress)

  return { hash, receipt, safeAddress }
}

/**
 * TanStack-wrapped variant of {@link deploySafe}. Exposes `mutateAsync`,
 * `isPending`, `error`, `data`. No default toast (see side-effect contract
 * above) — errors are left on `mutation.error` for inline rendering.
 */
export function useDeploySafe() {
  const queryClient = useQueryClient()

  return useMutation<DeploySafeResult, Error, DeploySafeArgs>({
    mutationKey: ['deploySafe'],
    mutationFn: deploySafe,
    onSuccess: ({ safeAddress }) => {
      queryClient.invalidateQueries({ queryKey: safeKeys.info(safeAddress) })
    },
    onError: (error) => {
      log.error('Safe deployment error:', error)
    }
  })
}
