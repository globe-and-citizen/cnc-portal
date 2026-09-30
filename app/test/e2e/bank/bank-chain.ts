// Bank-specific deployment fixture and contract helpers for the browser journey.
import { decodeEventLog, parseUnits, type Address } from 'viem'
import {
  artifact,
  deploy,
  E2E_OWNER,
  E2E_USDC_ADDRESS,
  E2E_USDCE_ADDRESS,
  encode,
  mockErc20Artifact,
  publicClient,
  write,
  type Artifact
} from '../e2e-chain'

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

const contractArtifact = (path: string) => artifact(`artifacts/contracts/${path}`)

async function readAddress(
  address: Address,
  abi: Artifact['abi'],
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

/**
 * Fresh local-chain treasury for the browser journey.
 *
 * The Bank, Cash Remuneration and Expense accounts are deployed through the
 * Officer exactly as production does. The mock tokens come from the global
 * setup, so the Vite E2E build already reads the addresses this fixture uses.
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
    mockErc20Artifact(),
    contractArtifact('FeeCollector.sol/FeeCollector.json'),
    contractArtifact('Officer.sol/Officer.json'),
    contractArtifact('Bank.sol/Bank.json'),
    contractArtifact('BoardOfDirectors.sol/BoardOfDirectors.json'),
    contractArtifact('CashRemunerationEIP712.sol/CashRemunerationEIP712.json'),
    contractArtifact('expense-account/ExpenseAccountEIP712.sol/ExpenseAccountEIP712.json'),
    contractArtifact('beacons/Beacon.sol/Beacon.json'),
    artifact(
      'artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json'
    )
  ])
  const usdc = E2E_USDC_ADDRESS
  const usdcE = E2E_USDCE_ADDRESS

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

export async function setBankFee(feeCollector: Address, feeBps: number): Promise<void> {
  const feeCollectorArtifact = await contractArtifact('FeeCollector.sol/FeeCollector.json')
  await write(feeCollector, feeCollectorArtifact.abi, 'setFee', ['BANK', feeBps])
}

export function grossForNet(net: bigint, feeBps: bigint): bigint {
  if (feeBps === 0n) return net
  const candidate = (net * 10000n) / (10000n - feeBps)
  return candidate - (candidate * feeBps) / 10000n < net ? candidate + 1n : candidate
}

export async function pauseBank(bank: Address): Promise<void> {
  const bankArtifact = await contractArtifact('Bank.sol/Bank.json')
  await write(bank, bankArtifact.abi, 'pause')
}

export async function unpauseBank(bank: Address): Promise<void> {
  const bankArtifact = await contractArtifact('Bank.sol/Bank.json')
  await write(bank, bankArtifact.abi, 'unpause')
}

export async function transferBankOwnership(bank: Address, owner: Address): Promise<void> {
  const bankArtifact = await contractArtifact('Bank.sol/Bank.json')
  await write(bank, bankArtifact.abi, 'transferOwnership', [owner])
}

export async function boardActionCount(board: Address): Promise<bigint> {
  const boardArtifact = await contractArtifact('BoardOfDirectors.sol/BoardOfDirectors.json')
  return publicClient.readContract({
    address: board,
    abi: boardArtifact.abi,
    functionName: 'getActionCount'
  }) as Promise<bigint>
}
