// Read-only chain assertions for Companies journeys. Infrastructure is
// deployed outside Playwright; browser actions own every tested transaction.
import type { Address } from 'viem'
import type { ContractType } from '../../../src/types/teamContract'
import { artifact, E2E_OWNER, publicClient, type Artifact } from '../e2e-chain'

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
