// Community Credit (FixedReturn) deployment fixture and contract helpers for the
// browser journey.
import { type Address } from 'viem'
import {
  artifact,
  deploy,
  E2E_OWNER,
  E2E_USDC_ADDRESS,
  encode,
  publicClient,
  write,
  type Artifact
} from '../e2e-chain'
import { deployBankE2EFixture, type BankE2EFixture } from '../bank/bank-chain'

export interface CommunityCreditE2EFixture extends BankE2EFixture {
  fixedReturn: Address
}

const contractArtifact = (path: string) => artifact(`artifacts/contracts/${path}`)

async function fixedReturnArtifact(): Promise<Artifact> {
  return contractArtifact('FixedReturn.sol/FixedReturn.json')
}

async function readFixedReturn<T>(
  fixedReturn: Address,
  functionName: string,
  args: readonly unknown[] = []
): Promise<T> {
  const { abi } = await fixedReturnArtifact()
  return publicClient.readContract({
    address: fixedReturn,
    abi,
    functionName,
    args: args as never
  }) as Promise<T>
}

async function writeFixedReturn(
  fixedReturn: Address,
  functionName: string,
  args: readonly unknown[] = []
) {
  const { abi } = await fixedReturnArtifact()
  return write(fixedReturn, abi, functionName, args)
}

/**
 * Fresh local-chain Credit Account for the browser journey. Reuses
 * `deployBankE2EFixture`'s Officer/Bank bootstrap (Community Credit's repayment
 * path runs through Bank) and adds a FixedReturn beacon proxy on the same
 * Officer, exactly as production does. FixedReturn has no dedicated
 * `FixedReturnDeployed` event the way Bank/Elections/etc. do, so its address is
 * recovered via `findDeployedContract` instead of decoding a deploy event.
 */
export async function deployCommunityCreditE2EFixture(): Promise<CommunityCreditE2EFixture> {
  const bankFixture = await deployBankE2EFixture()
  const { officer, usdc, usdcE } = bankFixture

  const [officerArtifact, beacon, fixedReturn] = await Promise.all([
    contractArtifact('Officer.sol/Officer.json'),
    contractArtifact('beacons/Beacon.sol/Beacon.json'),
    fixedReturnArtifact()
  ])

  const fixedReturnImplementation = await deploy(fixedReturn)
  const fixedReturnBeacon = await deploy(beacon, [fixedReturnImplementation])
  await write(officer, officerArtifact.abi, 'configureBeacon', ['FixedReturn', fixedReturnBeacon])

  const fixedReturnInitialization = encode(fixedReturn.abi, 'initialize', [
    [usdc, usdcE],
    E2E_OWNER
  ])
  await write(officer, officerArtifact.abi, 'deployBeaconProxy', [
    'FixedReturn',
    fixedReturnInitialization
  ])
  const fixedReturnAddress = (await publicClient.readContract({
    address: officer,
    abi: officerArtifact.abi,
    functionName: 'findDeployedContract',
    args: ['FixedReturn']
  })) as Address
  if (!fixedReturnAddress || fixedReturnAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('E2E Officer deployment did not register FixedReturn')
  }
  // `initialize`'s own tokenAddresses argument above already registers support
  // for usdc/usdcE on FixedReturn — and `deployBankE2EFixture` already did the
  // same for Bank via its own initializer — so no separate addTokenSupport call
  // is needed (a redundant one reverts with TokenSupport__AlreadyAdded).

  return { ...bankFixture, fixedReturn: fixedReturnAddress }
}

export interface LendingOffer {
  token: Address
  fundingTarget: bigint
  interestRateBps: bigint
  maturityDate: bigint
  subscriptionDeadline: bigint
  fundingAccess: 0 | 1
  isCapEnabled: boolean
  lenderCap: bigint
  totalFunded: bigint
  totalRepaidByIssuer: bigint
  state: 0 | 1 | 2 | 3
}

export async function getLendingOffer(
  fixedReturn: Address,
  offerId: bigint
): Promise<LendingOffer> {
  return readFixedReturn<LendingOffer>(fixedReturn, 'getLendingOffer', [offerId])
}

export interface CreateOfferParams {
  token: Address
  fundingTarget: bigint
  interestRateBps: bigint
  maturityDate: bigint
  subscriptionDeadline: bigint
  fundingAccess: 0 | 1
  isCapEnabled: boolean
  lenderCap: bigint
  whitelistAddrs: Address[]
  allocations: bigint[]
}

/**
 * Seeds a round directly on-chain, bypassing the wizard UI — for journeys that
 * need a round to already exist before the UI half of the test begins (e.g.
 * asserting what a *different* signed-in user sees), mirroring how
 * `bank-account.spec.ts` seeds chain state via `sendToken` before opening the
 * account UI rather than only ever creating state through the app.
 */
export async function createOfferOnChain(
  fixedReturn: Address,
  overrides: Partial<CreateOfferParams> = {}
): Promise<bigint> {
  const now = Number((await publicClient.getBlock()).timestamp)
  const subscriptionDeadline = BigInt(now + 3600)
  const params: CreateOfferParams = {
    token: E2E_USDC_ADDRESS,
    fundingTarget: 100_000_000_000n, // 100,000 USDC (6 decimals)
    interestRateBps: 800n,
    maturityDate: subscriptionDeadline + BigInt(365 * 24 * 3600),
    subscriptionDeadline,
    fundingAccess: 0,
    isCapEnabled: false,
    lenderCap: 0n,
    whitelistAddrs: [],
    allocations: [],
    ...overrides
  }
  await writeFixedReturn(fixedReturn, 'createLendingOffer', [params])
  return totalOfferings(fixedReturn)
}

export async function lenderDeposits(
  fixedReturn: Address,
  offerId: bigint,
  lender: Address
): Promise<bigint> {
  return readFixedReturn<bigint>(fixedReturn, 'getLenderDeposits', [offerId, lender])
}

export async function lenderAllocation(
  fixedReturn: Address,
  offerId: bigint,
  lender: Address
): Promise<bigint> {
  return readFixedReturn<bigint>(fixedReturn, 'getLenderAllocation', [offerId, lender])
}

export async function offerLenders(fixedReturn: Address, offerId: bigint): Promise<Address[]> {
  return readFixedReturn<Address[]>(fixedReturn, 'getOfferLenders', [offerId])
}

export async function totalOfferings(fixedReturn: Address): Promise<bigint> {
  return readFixedReturn<bigint>(fixedReturn, 'getTotalOfferings')
}
