import type { Address, Hex } from 'viem'
import type { Team } from '../../../src/types/team'
import { artifact, E2E_OWNER, publicClient, tokenBalance, write, type Artifact } from '../e2e-chain'

export interface ShareholderIssuanceE2EFixture {
  bank: Address
  investor: Address
  router: Address
  usdc: Address
  bankArtifact: Artifact
  investorArtifact: Artifact
  routerArtifact: Artifact
}

export interface ShareholderE2EFixture extends ShareholderIssuanceE2EFixture {
  safe: Address
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

export async function shareholderIssuanceFixtureFromTeam(
  team: Team
): Promise<ShareholderIssuanceE2EFixture> {
  const [bankArtifact, investorArtifact, routerArtifact] = await Promise.all([
    contractArtifact('Bank.sol/Bank.json'),
    contractArtifact('Investor/Investor.sol/Investor.json'),
    contractArtifact('SafeDepositRouter.sol/SafeDepositRouter.json')
  ])
  const router = teamContractAddress(team, 'SafeDepositRouter')

  return {
    bank: teamContractAddress(team, 'Bank'),
    investor: teamContractAddress(team, 'Investor'),
    router,
    usdc: await supportedUsdc(router, routerArtifact),
    bankArtifact,
    investorArtifact,
    routerArtifact
  }
}

export async function shareholderFixtureFromTeam(team: Team): Promise<ShareholderE2EFixture> {
  return {
    ...(await shareholderIssuanceFixtureFromTeam(team)),
    safe: teamContractAddress(team, 'Safe')
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
  fixture: ShareholderIssuanceE2EFixture,
  account: Address = E2E_OWNER
): Promise<ShareholderPosition> {
  const [balance, shareholders, symbol, totalSupply] = await Promise.all([
    read<bigint>(fixture.investor, fixture.investorArtifact, 'balanceOf', [account]),
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

export async function investorAddressFromOfficer(officer: Address): Promise<Address> {
  const officerArtifact = await contractArtifact('Officer.sol/Officer.json')
  const contracts = await read<readonly { contractType: string; contractAddress: Address }[]>(
    officer,
    officerArtifact,
    'getTeam'
  )
  const investor = contracts.find(
    (contract) => contract.contractType === 'Investor' || contract.contractType === 'InvestorV1'
  )
  if (!investor) throw new Error('Officer does not expose an Investor contract')
  return investor.contractAddress
}

export const migrationRoot = (fixture: ShareholderIssuanceE2EFixture) =>
  read<Hex>(fixture.investor, fixture.investorArtifact, 'getMigrationRoot')

export const migrationClaimed = (fixture: ShareholderIssuanceE2EFixture, shareholder: Address) =>
  read<boolean>(fixture.investor, fixture.investorArtifact, 'getMigrationClaimed', [shareholder])

export const migrationComplete = (fixture: ShareholderIssuanceE2EFixture) =>
  read<boolean>(fixture.investor, fixture.investorArtifact, 'isMigrationComplete')

export const mintInvestorShares = (
  fixture: ShareholderIssuanceE2EFixture,
  shareholder: Address,
  amount: bigint
) => write(fixture.investor, fixture.investorArtifact.abi, 'individualMint', [shareholder, amount])

export const safeUsdcBalance = (fixture: ShareholderE2EFixture) =>
  tokenBalance(fixture.usdc, fixture.safe)

export const bankUsdcBalance = (fixture: ShareholderIssuanceE2EFixture) =>
  tokenBalance(fixture.usdc, fixture.bank)

export async function ensureUsdcBalance(
  fixture: ShareholderIssuanceE2EFixture,
  account: Address,
  minimum: bigint
): Promise<void> {
  const current = await tokenBalance(fixture.usdc, account)
  if (current >= minimum) return

  const tokenArtifact = await contractArtifact('test/MockERC20.sol/MockERC20.json')
  await write(fixture.usdc, tokenArtifact.abi, 'mint', [account, minimum - current])
}

export async function depositedEvents(fixture: ShareholderE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.router,
    abi: fixture.routerArtifact.abi,
    eventName: 'Deposited',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function mintedEvents(fixture: ShareholderIssuanceE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.investor,
    abi: fixture.investorArtifact.abi,
    eventName: 'Minted',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function migrationRootSetEvents(fixture: ShareholderIssuanceE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.investor,
    abi: fixture.investorArtifact.abi,
    eventName: 'MigrationRootSet',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function migrationClaimedEvents(fixture: ShareholderIssuanceE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.investor,
    abi: fixture.investorArtifact.abi,
    eventName: 'MigrationClaimed',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function migrationCompletedEvents(fixture: ShareholderIssuanceE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.investor,
    abi: fixture.investorArtifact.abi,
    eventName: 'MigrationCompleted',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function dividendDistributedEvents(fixture: ShareholderIssuanceE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.investor,
    abi: fixture.investorArtifact.abi,
    eventName: 'DividendDistributed',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function dividendPaidEvents(fixture: ShareholderIssuanceE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.investor,
    abi: fixture.investorArtifact.abi,
    eventName: 'DividendPaid',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function bankDividendEvents(fixture: ShareholderIssuanceE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.bank,
    abi: fixture.bankArtifact.abi,
    eventName: 'DividendDistributionTriggered',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}
