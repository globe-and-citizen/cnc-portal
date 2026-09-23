// Chain access shared by every account journey: the E2E accounts, the viem
// clients bound to the dedicated Hardhat node, contract artifacts, and the
// deterministic infrastructure prepared before browser acceptance starts.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseEther,
  parseUnits,
  type Abi,
  type Address,
  type Hex
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'
import { E2E_RPC_URL, E2E_SAFE_INFRA, E2E_SAFE_LIBRARIES, E2E_TOKENS } from '../../src/e2e/chain.ts'

/** Hardhat's well-known accounts #0, #1 and #2 — public test keys. */
export const E2E_OWNER_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
export const E2E_MEMBER_PRIVATE_KEY: Hex =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
export const E2E_OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address
export const E2E_MEMBER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address
export const E2E_NEW_SIGNER = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as Address

export const E2E_USDC_ADDRESS: Address = E2E_TOKENS.usdc
export const E2E_USDCE_ADDRESS: Address = E2E_TOKENS.usdcE

export const ownerAccount = privateKeyToAccount(E2E_OWNER_PRIVATE_KEY)
export const memberAccount = privateKeyToAccount(E2E_MEMBER_PRIVATE_KEY)
export const publicClient = createPublicClient({ chain: hardhat, transport: http(E2E_RPC_URL) })
export const walletClient = createWalletClient({
  account: ownerAccount,
  chain: hardhat,
  transport: http(E2E_RPC_URL)
})

export interface Artifact {
  abi: Abi
  bytecode: Hex
}

const SAFE_CONTRACTS = 'node_modules/@safe-global/safe-contracts/build/artifacts/contracts'

/** Load a compiled artifact by its path under `contract/`. */
export async function artifact(path: string): Promise<Artifact> {
  const absolutePath = fileURLToPath(new URL(`../../../contract/${path}`, import.meta.url))
  return JSON.parse(await readFile(absolutePath, 'utf8')) as Artifact
}

export const mockErc20Artifact = () =>
  artifact('artifacts/contracts/test/MockERC20.sol/MockERC20.json')
export const safeArtifact = () => artifact(`${SAFE_CONTRACTS}/SafeL2.sol/SafeL2.json`)
export const safeProxyFactoryArtifact = () =>
  artifact(`${SAFE_CONTRACTS}/proxies/SafeProxyFactory.sol/SafeProxyFactory.json`)

export async function deploy(contract: Artifact, args: readonly unknown[] = []): Promise<Address> {
  const hash = await walletClient.deployContract({
    abi: contract.abi,
    bytecode: contract.bytecode,
    args: args as never
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (!receipt.contractAddress) throw new Error('E2E contract deployment did not create a contract')
  return receipt.contractAddress
}

export async function write(
  address: Address,
  abi: Abi,
  functionName: string,
  args: readonly unknown[] = []
) {
  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args: args as never
  })
  return publicClient.waitForTransactionReceipt({ hash })
}

export function encode(abi: Abi, functionName: string, args: readonly unknown[] = []): Hex {
  return encodeFunctionData({ abi, functionName, args: args as never })
}

export async function hasCode(address: Address): Promise<boolean> {
  const code = await publicClient.getCode({ address })
  return Boolean(code && code !== '0x')
}

/**
 * Deploy the mock tokens and the Safe infrastructure on the fresh E2E node.
 * Runs from the explicit browser-environment setup before Vite and Playwright,
 * so the browser build can rely on the addresses in `src/e2e/chain.ts`.
 */
export async function ensureE2EInfrastructure(): Promise<void> {
  const expected: Address[] = [
    E2E_USDC_ADDRESS,
    E2E_USDCE_ADDRESS,
    E2E_SAFE_INFRA.singleton,
    E2E_SAFE_INFRA.proxyFactory,
    E2E_SAFE_INFRA.fallbackHandler,
    E2E_SAFE_LIBRARIES.multiSend,
    E2E_SAFE_LIBRARIES.multiSendCallOnly
  ]
  const present = await Promise.all(expected.map(hasCode))

  if (present.every(Boolean)) return
  if (present.some(Boolean)) {
    throw new Error('E2E infrastructure must be initialized on a fresh Hardhat node')
  }

  const [mockErc20, safe, proxyFactory, fallbackHandler, multiSend, multiSendCallOnly] =
    await Promise.all([
      mockErc20Artifact(),
      safeArtifact(),
      safeProxyFactoryArtifact(),
      artifact(
        `${SAFE_CONTRACTS}/handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json`
      ),
      artifact(`${SAFE_CONTRACTS}/libraries/MultiSend.sol/MultiSend.json`),
      artifact(`${SAFE_CONTRACTS}/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json`)
    ])

  const deployments: Array<[Artifact, readonly unknown[]]> = [
    [mockErc20, ['USD Coin', 'USDC']],
    [mockErc20, ['USD Coin Bridged', 'USDCe']],
    [safe, []],
    [proxyFactory, []],
    [fallbackHandler, []],
    [multiSend, []],
    [multiSendCallOnly, []]
  ]
  for (const [index, [contract, args]] of deployments.entries()) {
    const address = await deploy(contract, args)
    if (address.toLowerCase() !== expected[index]!.toLowerCase()) {
      throw new Error(`E2E infrastructure landed on ${address} instead of ${expected[index]}`)
    }
  }
}

export async function nativeBalance(holder: Address): Promise<bigint> {
  return publicClient.getBalance({ address: holder })
}

export async function tokenBalance(token: Address, holder: Address): Promise<bigint> {
  const mockErc20 = await mockErc20Artifact()
  return publicClient.readContract({
    address: token,
    abi: mockErc20.abi,
    functionName: 'balanceOf',
    args: [holder]
  }) as Promise<bigint>
}

export async function sendNative(to: Address, amount: string): Promise<void> {
  const hash = await walletClient.sendTransaction({ to, value: parseEther(amount) })
  await publicClient.waitForTransactionReceipt({ hash })
}

export async function sendToken(token: Address, to: Address, amount: string): Promise<void> {
  const mockErc20 = await mockErc20Artifact()
  await write(token, mockErc20.abi, 'transfer', [to, parseUnits(amount, 6)])
}

export async function snapshotChain(): Promise<string> {
  return publicClient.request({ method: 'evm_snapshot' } as never) as Promise<string>
}

export async function revertChain(snapshotId: string): Promise<void> {
  await publicClient.request({ method: 'evm_revert', params: [snapshotId] } as never)
}
