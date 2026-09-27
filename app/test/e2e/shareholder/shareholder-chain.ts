import type { Address } from 'viem'
import type { Team } from '../../../src/types/team'
import { artifact, E2E_OWNER, publicClient, tokenBalance, type Artifact } from '../e2e-chain'

export interface ShareholderE2EFixture {
  investor: Address
  router: Address
  safe: Address
  usdc: Address
  investorArtifact: Artifact
  routerArtifact: Artifact
}

export interface ShareholderPosition {
  balance: bigint
  shareholders: readonly { shareholder: Address; amount: bigint }[]
  symbol: string
  totalSupply: bigint
}

const contractArtifact = (path: string) => artifact(`artifacts/contracts/${path}`)

const teamContractAddress = (team: Team, type: string): Address => {
  const contract = team.teamContracts.find((candidate) => candidate.type === type)
  if (!contract) throw new Error(`Integrated company is missing its ${type} contract`)
  return contract.address
}

async function read<T>(
  contract: Address,
  loadedArtifact: Artifact,
  functionName: string,
  args: readonly unknown[] = []
): Promise<T> {
  return publicClient.readContract({
    address: contract,
    abi: loadedArtifact.abi,
    functionName,
    args: args as never
  }) as Promise<T>
}

async function supportedUsdc(router: Address, routerArtifact: Artifact): Promise<Address> {
  const tokenArtifact = await contractArtifact('test/MockERC20.sol/MockERC20.json')
  const supported = await read<readonly Address[]>(router, routerArtifact, 'getSupportedTokens')

  for (const token of supported) {
    const symbol = await read<string>(token, tokenArtifact, 'symbol')
    if (symbol === 'USDC') return token
  }

  throw new Error('Integrated Safe Deposit Router does not support USDC')
}

export async function shareholderFixtureFromTeam(team: Team): Promise<ShareholderE2EFixture> {
  const [investorArtifact, routerArtifact] = await Promise.all([
    contractArtifact('Investor/Investor.sol/Investor.json'),
    contractArtifact('SafeDepositRouter.sol/SafeDepositRouter.json')
  ])
  const router = teamContractAddress(team, 'SafeDepositRouter')

  return {
    investor: teamContractAddress(team, 'Investor'),
    router,
    safe: teamContractAddress(team, 'Safe'),
    usdc: await supportedUsdc(router, routerArtifact),
    investorArtifact,
    routerArtifact
  }
}

export async function routerState(fixture: ShareholderE2EFixture) {
  const [depositsEnabled, multiplier, owner, safeAddress] = await Promise.all([
    read<boolean>(fixture.router, fixture.routerArtifact, 'getDepositsEnabled'),
    read<bigint>(fixture.router, fixture.routerArtifact, 'getMultiplier'),
    read<Address>(fixture.router, fixture.routerArtifact, 'owner'),
    read<Address>(fixture.router, fixture.routerArtifact, 'getSafeAddress')
  ])
  return { depositsEnabled, multiplier, owner, safeAddress }
}

export async function shareholderPosition(
  fixture: ShareholderE2EFixture
): Promise<ShareholderPosition> {
  const [balance, shareholders, symbol, totalSupply] = await Promise.all([
    read<bigint>(fixture.investor, fixture.investorArtifact, 'balanceOf', [E2E_OWNER]),
    read<readonly { shareholder: Address; amount: bigint }[]>(
      fixture.investor,
      fixture.investorArtifact,
      'getShareholders'
    ),
    read<string>(fixture.investor, fixture.investorArtifact, 'symbol'),
    read<bigint>(fixture.investor, fixture.investorArtifact, 'totalSupply')
  ])
  return { balance, shareholders, symbol, totalSupply }
}

export const safeUsdcBalance = (fixture: ShareholderE2EFixture) =>
  tokenBalance(fixture.usdc, fixture.safe)

export async function depositedEvents(fixture: ShareholderE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.router,
    abi: fixture.routerArtifact.abi,
    eventName: 'Deposited',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}
