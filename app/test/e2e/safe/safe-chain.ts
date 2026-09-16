// Safe-specific deployment fixture and contract reads for the browser journey.
import {
  decodeEventLog,
  encodeFunctionData,
  parseUnits,
  zeroAddress,
  type Address,
  type Hex
} from 'viem'
import { E2E_SAFE_INFRA } from '../../../src/e2e/chain'
import {
  E2E_MEMBER,
  E2E_OWNER,
  E2E_USDC_ADDRESS,
  E2E_USDCE_ADDRESS,
  memberAccount,
  mockErc20Artifact,
  publicClient,
  safeArtifact,
  safeProxyFactoryArtifact,
  write
} from '../e2e-chain'

interface SafeTransactionInput {
  to: Address
  value: bigint
  data?: Hex
  operation?: number
  nonce?: number
}

export interface SafeE2EFixture {
  safe: Address
  multisigSafe: Address
  usdc: Address
  usdcE: Address
}

async function deploySafeProxy(
  owners: Address[],
  threshold: number,
  saltNonce: bigint
): Promise<Address> {
  const [safe, proxyFactory] = await Promise.all([safeArtifact(), safeProxyFactoryArtifact()])
  const initializer = encodeFunctionData({
    abi: safe.abi,
    functionName: 'setup',
    args: [
      owners,
      BigInt(threshold),
      zeroAddress,
      '0x',
      E2E_SAFE_INFRA.fallbackHandler,
      zeroAddress,
      0n,
      zeroAddress
    ]
  })
  const receipt = await write(
    E2E_SAFE_INFRA.proxyFactory,
    proxyFactory.abi,
    'createProxyWithNonce',
    [E2E_SAFE_INFRA.singleton, initializer, saltNonce]
  )
  const deployed = receipt.logs
    .map((log) => {
      try {
        return decodeEventLog({ abi: proxyFactory.abi, data: log.data, topics: log.topics })
      } catch {
        return null
      }
    })
    .find((event) => event?.eventName === 'ProxyCreation')
  const safeAddress = deployed?.args.proxy as Address | undefined
  if (!safeAddress) throw new Error('Safe E2E proxy deployment did not emit ProxyCreation')
  return safeAddress
}

/** Deploys real one-of-one and two-of-two Safe proxies on the E2E chain. */
export async function deploySafeE2EFixture(): Promise<SafeE2EFixture> {
  const mockErc20 = await mockErc20Artifact()
  await write(E2E_USDC_ADDRESS, mockErc20.abi, 'mint', [E2E_OWNER, parseUnits('1000', 6)])
  await write(E2E_USDC_ADDRESS, mockErc20.abi, 'mint', [E2E_MEMBER, parseUnits('1000', 6)])

  // Playwright restarts the worker before a retry while the shared Hardhat
  // node remains alive. Deriving the salts from its advancing block height
  // prevents a retry from attempting to recreate the same CREATE2 proxies.
  const fixtureSalt = (await publicClient.getBlockNumber()) * 2n
  const safe = await deploySafeProxy([E2E_OWNER], 1, fixtureSalt + 1n)
  const multisigSafe = await deploySafeProxy([E2E_OWNER, E2E_MEMBER], 2, fixtureSalt + 2n)

  return { safe, multisigSafe, usdc: E2E_USDC_ADDRESS, usdcE: E2E_USDCE_ADDRESS }
}

async function readSafe<T>(safeAddress: Address, functionName: string): Promise<T> {
  const safe = await safeArtifact()
  return publicClient.readContract({
    address: safeAddress,
    abi: safe.abi,
    functionName
  }) as Promise<T>
}

export const safeOwners = (safeAddress: Address) => readSafe<Address[]>(safeAddress, 'getOwners')

export async function safeThreshold(safeAddress: Address): Promise<number> {
  return Number(await readSafe<bigint>(safeAddress, 'getThreshold'))
}

export async function safeNonce(safeAddress: Address): Promise<number> {
  return Number(await readSafe<bigint>(safeAddress, 'nonce'))
}

export async function safeTransactionHash(
  safeAddress: Address,
  transaction: SafeTransactionInput
): Promise<Hex> {
  const safe = await safeArtifact()
  return publicClient.readContract({
    address: safeAddress,
    abi: safe.abi,
    functionName: 'getTransactionHash',
    args: [
      transaction.to,
      transaction.value,
      transaction.data ?? '0x',
      transaction.operation ?? 0,
      0n,
      0n,
      0n,
      zeroAddress,
      zeroAddress,
      BigInt(transaction.nonce ?? 0)
    ]
  }) as Promise<Hex>
}

/** Safe's ETH_SIGN signatures use the EIP-191 recovery-byte offset. */
export async function memberSafeSignature(safeTxHash: Hex): Promise<Hex> {
  const signature = await memberAccount.signMessage({ message: { raw: safeTxHash } })
  const recovery = Number.parseInt(signature.slice(-2), 16) + 4
  return `${signature.slice(0, -2)}${recovery.toString(16).padStart(2, '0')}` as Hex
}
