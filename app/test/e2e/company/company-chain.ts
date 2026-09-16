// Company-specific chain fixture: the real Officer implementations and
// beacons the wizard deploys against, plus the Hardhat controls the failure
// journeys use to break and restore a deployment.
import type { Address, Hex } from 'viem'
import type { ContractType } from '../../../src/types/teamContract'
import {
  artifact,
  deploy,
  encode,
  E2E_OWNER,
  E2E_USDC_ADDRESS,
  E2E_USDCE_ADDRESS,
  mockErc20Artifact,
  publicClient,
  type Artifact
} from '../e2e-chain'

export type CompanyAddresses = Record<string, Address>

/** `PUSH1 0 PUSH1 0 REVERT`: every call to the contract reverts. */
const REVERTING_BYTECODE: Hex = '0x60006000fd'

const contract = (path: string) => artifact(`artifacts/contracts/${path}`)
const officerArtifact = () => contract('Officer.sol/Officer.json')
const investorArtifact = () => contract('Investor/Investor.sol/Investor.json')

/** Ignition module, contract type, artifact path and beacon key of each Officer child. */
const implementations = [
  ['BankBeaconModule', 'Bank', 'Bank.sol/Bank.json', 'Beacon'],
  [
    'BoardOfDirectorsModule',
    'BoardOfDirectors',
    'BoardOfDirectors.sol/BoardOfDirectors.json',
    'Beacon'
  ],
  [
    'CashRemunerationEIP712Module',
    'CashRemunerationEIP712',
    'CashRemunerationEIP712.sol/CashRemunerationEIP712.json',
    'FactoryBeacon'
  ],
  ['ElectionsBeaconModule', 'Elections', 'Elections/Elections.sol/Elections.json', 'Beacon'],
  [
    'ExpenseAccountEIP712Module',
    'ExpenseAccountEIP712',
    'expense-account/ExpenseAccountEIP712.sol/ExpenseAccountEIP712.json',
    'FactoryBeacon'
  ],
  ['InvestorBeaconModule', 'Investor', 'Investor/Investor.sol/Investor.json', 'Beacon'],
  ['ProposalBeaconModule', 'Proposals', 'Proposals/Proposals.sol/Proposals.json', 'Beacon'],
  [
    'SafeDepositRouterBeaconModule',
    'SafeDepositRouter',
    'SafeDepositRouter.sol/SafeDepositRouter.json',
    'Beacon'
  ],
  ['VestingBeaconModule', 'Vesting', 'Vesting.sol/Vesting.json', 'Beacon'],
  ['FixedReturnBeaconModule', 'FixedReturn', 'FixedReturn.sol/FixedReturn.json', 'Beacon']
] as const

export const expectedContractTypes = implementations.map(([, type]) => type).sort()

/** Real implementations and beacons; the browser must deploy its own Officer proxy and children. */
export async function deployCompanyInfrastructure(): Promise<CompanyAddresses> {
  const addresses: CompanyAddresses = {
    'MockTokens#USDC': E2E_USDC_ADDRESS,
    'MockTokens#USDCe': E2E_USDCE_ADDRESS,
    'MockTokens#USDT': await deploy(await mockErc20Artifact(), ['Tether', 'USDT'])
  }
  const beacon = await contract('beacons/FactoryBeacon.sol/FactoryBeacon.json')
  for (const [module, name, path, beaconName] of implementations) {
    const implementation = await deploy(await contract(path))
    addresses[`${module}#${name}`] = implementation
    addresses[`${module}#${beaconName}`] = await deploy(beacon, [implementation])
  }
  const feeCollector = await contract('FeeCollector.sol/FeeCollector.json')
  const proxy = await artifact(
    'artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json'
  )
  const fee = await deploy(proxy, [
    await deploy(feeCollector),
    E2E_OWNER,
    encode(feeCollector.abi, 'initialize', [E2E_OWNER, [], [E2E_USDC_ADDRESS, E2E_USDCE_ADDRESS]])
  ])
  addresses['FeeCollectorModule#FeeCollector'] = fee
  addresses['Officer#Officer'] = await deploy(await officerArtifact(), [fee])
  addresses['Officer#FactoryBeacon'] = await deploy(beacon, [addresses['Officer#Officer']])
  return addresses
}

async function read<T>(
  load: () => Promise<Artifact>,
  address: Address,
  functionName: string
): Promise<T> {
  const { abi } = await load()
  return publicClient.readContract({ address, abi, functionName }) as Promise<T>
}

export const officerOwner = (officer: Address) => read<Address>(officerArtifact, officer, 'owner')

export const deployedContracts = (officer: Address) =>
  read<Array<{ contractType: ContractType; contractAddress: Address }>>(
    officerArtifact,
    officer,
    'getDeployedContracts'
  )

export async function investorDetails(investor: Address) {
  const [name, symbol, owner] = await Promise.all([
    read<string>(investorArtifact, investor, 'name'),
    read<string>(investorArtifact, investor, 'symbol'),
    read<Address>(investorArtifact, investor, 'owner')
  ])
  return { name, symbol, owner }
}

export const ownerNonce = () => publicClient.getTransactionCount({ address: E2E_OWNER })

const hardhat = (method: string, params: unknown[] = []) =>
  publicClient.request({ method, params } as never)

export const setCode = (address: Address, code: Hex) =>
  hardhat('hardhat_setCode', [address, code]) as Promise<void>

export const setBalance = (address: Address, balance: bigint) =>
  hardhat('hardhat_setBalance', [address, `0x${balance.toString(16)}`]) as Promise<void>

/** Automine is a node setting, not reliably restored by an EVM snapshot. */
export const setAutomine = (enabled: boolean) =>
  hardhat('evm_setAutomine', [enabled]) as Promise<void>

export const mineBlock = () => hardhat('evm_mine') as Promise<void>

/** Make every call to `address` revert; returns the step that restores its code. */
export async function breakContract(address: Address): Promise<() => Promise<void>> {
  const code = await publicClient.getCode({ address })
  await setCode(address, REVERTING_BYTECODE)
  return () => setCode(address, code!)
}

/** Empty `address` so it cannot pay for gas; returns the step that refunds it. */
export async function drainBalance(address: Address): Promise<() => Promise<void>> {
  const balance = await publicClient.getBalance({ address })
  await setBalance(address, 0n)
  return () => setBalance(address, balance)
}
