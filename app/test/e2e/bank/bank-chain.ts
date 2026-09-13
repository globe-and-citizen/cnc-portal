import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
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

export const E2E_PRIVATE_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
export const E2E_RECIPIENT_PRIVATE_KEY: Hex =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
export const E2E_OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address
export const E2E_RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address

const RPC_URL = 'http://127.0.0.1:8546'
const account = privateKeyToAccount(E2E_PRIVATE_KEY)
const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC_URL) })
const walletClient = createWalletClient({ account, chain: hardhat, transport: http(RPC_URL) })

interface Artifact {
  abi: Abi
  bytecode: Hex
}

export interface BankE2EFixture {
  bank: Address
  board: Address
  cashRemuneration: Address
  expenseAccount: Address
  feeCollector: Address
  officer: Address
  usdc: Address
  usdcE: Address
}

async function artifact(path: string): Promise<Artifact> {
  const absolutePath = fileURLToPath(
    new URL(`../../../../contract/artifacts/${path}`, import.meta.url)
  )
  return JSON.parse(await readFile(absolutePath, 'utf8')) as Artifact
}

async function deploy(contract: Artifact, args: readonly unknown[] = []): Promise<Address> {
  const hash = await walletClient.deployContract({
    abi: contract.abi,
    bytecode: contract.bytecode,
    args: args as never
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (!receipt.contractAddress) throw new Error('E2E contract deployment did not create a contract')
  return receipt.contractAddress
}

async function write(
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

async function readAddress(
  address: Address,
  abi: Abi,
  functionName: string,
  args: readonly unknown[] = []
): Promise<Address> {
  return publicClient.readContract({
    address,
    abi,
    functionName,
    args: args as never
  }) as Promise<Address>
}

function encode(abi: Abi, functionName: string, args: readonly unknown[] = []): Hex {
  return encodeFunctionData({ abi, functionName, args: args as never })
}

/**
 * Fresh local-chain treasury for the browser journey.
 *
 * The deployment order deliberately starts with USDC and USDCe. Their addresses
 * are injected into the Vite E2E build by Playwright so the application reads
 * the same contracts that this fixture deploys on the suite's fresh node.
 */
export async function deployBankE2EFixture(): Promise<BankE2EFixture> {
  const [
    mockErc20,
    feeCollector,
    officer,
    bank,
    board,
    cashRemuneration,
    expenseAccount,
    beacon,
    transparentProxy
  ] = await Promise.all([
    artifact('contracts/test/MockERC20.sol/MockERC20.json'),
    artifact('contracts/FeeCollector.sol/FeeCollector.json'),
    artifact('contracts/Officer.sol/Officer.json'),
    artifact('contracts/Bank.sol/Bank.json'),
    artifact('contracts/BoardOfDirectors.sol/BoardOfDirectors.json'),
    artifact('contracts/CashRemunerationEIP712.sol/CashRemunerationEIP712.json'),
    artifact('contracts/expense-account/ExpenseAccountEIP712.sol/ExpenseAccountEIP712.json'),
    artifact('contracts/beacons/Beacon.sol/Beacon.json'),
    artifact(
      '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json'
    )
  ])

  const usdc = await deploy(mockErc20, ['USD Coin', 'USDC'])
  const usdcE = await deploy(mockErc20, ['USD Coin Bridged', 'USDCe'])

  const feeCollectorImplementation = await deploy(feeCollector)
  const feeCollectorInitialization = encode(feeCollector.abi, 'initialize', [
    E2E_OWNER,
    [],
    [usdc, usdcE]
  ])
  const feeCollectorProxy = await deploy(transparentProxy, [
    feeCollectorImplementation,
    E2E_OWNER,
    feeCollectorInitialization
  ])

  const officerImplementation = await deploy(officer, [feeCollectorProxy])
  const officerInitialization = encode(officer.abi, 'initialize', [E2E_OWNER, [], [], false])
  const officerProxy = await deploy(transparentProxy, [
    officerImplementation,
    E2E_OWNER,
    officerInitialization
  ])

  const bankImplementation = await deploy(bank)
  const bankBeacon = await deploy(beacon, [bankImplementation])
  await write(officerProxy, officer.abi, 'configureBeacon', ['Bank', bankBeacon])

  const bankInitialization = encode(bank.abi, 'initialize', [[usdc, usdcE], E2E_OWNER])
  const bankDeployment = await write(officerProxy, officer.abi, 'deployBeaconProxy', [
    'Bank',
    bankInitialization
  ])
  const bankDeployed = bankDeployment.logs
    .map((log) => {
      try {
        return decodeEventLog({ abi: officer.abi, data: log.data, topics: log.topics })
      } catch {
        return null
      }
    })
    .find((event) => event?.eventName === 'BankDeployed')
  const bankAddress = bankDeployed?.args.bank as Address | undefined
  if (!bankAddress) throw new Error('E2E Officer deployment did not emit BankDeployed')

  const boardImplementation = await deploy(board)
  const boardInitialization = encode(board.abi, 'initialize', [[E2E_OWNER]])
  const boardProxy = await deploy(transparentProxy, [
    boardImplementation,
    E2E_OWNER,
    boardInitialization
  ])
  await write(boardProxy, board.abi, 'setBoardOfDirectors', [[E2E_OWNER]])

  const deployOfficerAccount = async (
    contractType: 'CashRemunerationEIP712' | 'ExpenseAccountEIP712',
    implementation: Artifact
  ): Promise<Address> => {
    const implementationAddress = await deploy(implementation)
    const beaconAddress = await deploy(beacon, [implementationAddress])
    await write(officerProxy, officer.abi, 'configureBeacon', [contractType, beaconAddress])
    const initialization = encode(implementation.abi, 'initialize', [E2E_OWNER, [usdc, usdcE]])
    await write(officerProxy, officer.abi, 'deployBeaconProxy', [contractType, initialization])
    return readAddress(officerProxy, officer.abi, 'findDeployedContract', [contractType])
  }

  const cashRemunerationAddress = await deployOfficerAccount(
    'CashRemunerationEIP712',
    cashRemuneration
  )
  const expenseAccountAddress = await deployOfficerAccount('ExpenseAccountEIP712', expenseAccount)

  await write(usdc, mockErc20.abi, 'mint', [E2E_OWNER, parseUnits('1000', 6)])
  await write(usdcE, mockErc20.abi, 'mint', [E2E_OWNER, parseUnits('1000', 6)])

  return {
    bank: bankAddress,
    board: boardProxy,
    cashRemuneration: cashRemunerationAddress,
    expenseAccount: expenseAccountAddress,
    feeCollector: feeCollectorProxy,
    officer: officerProxy,
    usdc,
    usdcE
  }
}

export async function bankNativeBalance(bank: Address): Promise<bigint> {
  return publicClient.getBalance({ address: bank })
}

export async function tokenBalance(token: Address, holder: Address): Promise<bigint> {
  const mockErc20 = await artifact('contracts/test/MockERC20.sol/MockERC20.json')
  return publicClient.readContract({
    address: token,
    abi: mockErc20.abi,
    functionName: 'balanceOf',
    args: [holder]
  }) as Promise<bigint>
}

export async function nativeBalance(holder: Address): Promise<bigint> {
  return publicClient.getBalance({ address: holder })
}

export async function sendNative(to: Address, amount: string): Promise<void> {
  const hash = await walletClient.sendTransaction({ account, to, value: parseEther(amount) })
  await publicClient.waitForTransactionReceipt({ hash })
}

export async function sendToken(token: Address, to: Address, amount: string): Promise<void> {
  const mockErc20 = await artifact('contracts/test/MockERC20.sol/MockERC20.json')
  await write(token, mockErc20.abi, 'transfer', [to, parseUnits(amount, 6)])
}

export async function setBankFee(feeCollector: Address, feeBps: number): Promise<void> {
  const feeCollectorArtifact = await artifact('contracts/FeeCollector.sol/FeeCollector.json')
  await write(feeCollector, feeCollectorArtifact.abi, 'setFee', ['BANK', feeBps])
}

export function grossForNet(net: bigint, feeBps: bigint): bigint {
  if (feeBps === 0n) return net
  const candidate = (net * 10000n) / (10000n - feeBps)
  return candidate - (candidate * feeBps) / 10000n < net ? candidate + 1n : candidate
}

export async function pauseBank(bank: Address): Promise<void> {
  const bankArtifact = await artifact('contracts/Bank.sol/Bank.json')
  await write(bank, bankArtifact.abi, 'pause')
}

export async function unpauseBank(bank: Address): Promise<void> {
  const bankArtifact = await artifact('contracts/Bank.sol/Bank.json')
  await write(bank, bankArtifact.abi, 'unpause')
}

export async function transferBankOwnership(bank: Address, owner: Address): Promise<void> {
  const bankArtifact = await artifact('contracts/Bank.sol/Bank.json')
  await write(bank, bankArtifact.abi, 'transferOwnership', [owner])
}

export async function boardActionCount(board: Address): Promise<bigint> {
  const boardArtifact = await artifact('contracts/BoardOfDirectors.sol/BoardOfDirectors.json')
  return publicClient.readContract({
    address: board,
    abi: boardArtifact.abi,
    functionName: 'getActionCount'
  }) as Promise<bigint>
}

export async function snapshotChain(): Promise<string> {
  return publicClient.request({ method: 'evm_snapshot' } as never) as Promise<string>
}

export async function revertChain(snapshotId: string): Promise<void> {
  await publicClient.request({ method: 'evm_revert', params: [snapshotId] } as never)
}
