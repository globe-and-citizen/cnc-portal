import type { Address, Hex } from 'viem'
import type { Team } from '../../../src/types/team'
import {
  artifact,
  deploy,
  E2E_OWNER,
  encode,
  publicClient,
  write,
  type Artifact
} from '../e2e-chain'

export interface ElectionsE2EFixture {
  board: Address
  elections: Address
  officer: Address
  electionsArtifact: Artifact
  boardArtifact: Artifact
}

export type BoardActionState = readonly [
  id: bigint,
  target: Address,
  description: string,
  approvalCount: number,
  isExecuted: boolean,
  data: Hex,
  createdBy: Address
]

interface ElectionInput {
  candidates: readonly Address[]
  voters: readonly Address[]
  startDelaySeconds?: number
  durationSeconds?: number
  title?: string
}

const contractArtifact = (path: string) => artifact(`artifacts/contracts/${path}`)

const teamContractAddress = (team: Team, type: string): Address => {
  const contract = team.teamContracts.find((candidate) => candidate.type === type)
  if (!contract) throw new Error(`Integrated company is missing its ${type} contract`)
  return contract.address
}

export async function currentE2ETime(): Promise<number> {
  const chainTime = Number((await publicClient.getBlock()).timestamp)
  return Math.max(chainTime, Math.floor(Date.now() / 1_000))
}

export async function deployElectionsE2EFixture(): Promise<ElectionsE2EFixture> {
  const [officerArtifact, boardArtifact, electionsArtifact, beaconArtifact] = await Promise.all([
    contractArtifact('mocks/MockOfficer.sol/MockOfficer.json'),
    contractArtifact('mocks/MockBoardOfDirectors.sol/MockBoardOfDirectors.json'),
    contractArtifact('Elections/Elections.sol/Elections.json'),
    contractArtifact('beacons/Beacon.sol/Beacon.json')
  ])

  const officer = await deploy(officerArtifact)
  const board = await deploy(boardArtifact)
  await write(board, boardArtifact.abi, 'initialize', [[E2E_OWNER]])
  await write(officer, officerArtifact.abi, 'setDeployedContract', ['BoardOfDirectors', board])

  const electionsImplementation = await deploy(electionsArtifact)
  const electionsBeacon = await deploy(beaconArtifact, [electionsImplementation])
  const initialization = encode(electionsArtifact.abi, 'initialize', [E2E_OWNER])
  await write(officer, officerArtifact.abi, 'deployBeaconProxy', [
    electionsBeacon,
    initialization,
    'Elections'
  ])
  const elections = (await publicClient.readContract({
    address: officer,
    abi: officerArtifact.abi,
    functionName: 'findDeployedContract',
    args: ['Elections']
  })) as Address

  return { board, elections, officer, electionsArtifact, boardArtifact }
}

export async function electionsFixtureFromTeam(team: Team): Promise<ElectionsE2EFixture> {
  if (!team.currentOfficer) throw new Error('Integrated company is missing its current Officer')

  const [electionsArtifact, boardArtifact] = await Promise.all([
    contractArtifact('Elections/Elections.sol/Elections.json'),
    contractArtifact('BoardOfDirectors.sol/BoardOfDirectors.json')
  ])

  return {
    officer: team.currentOfficer.address,
    elections: teamContractAddress(team, 'Elections'),
    board: teamContractAddress(team, 'BoardOfDirectors'),
    electionsArtifact,
    boardArtifact
  }
}

export async function createElectionFixture(
  fixture: ElectionsE2EFixture,
  input: ElectionInput
): Promise<number> {
  const now = await currentE2ETime()
  const startDate = now + (input.startDelaySeconds ?? 60)
  const endDate = startDate + (input.durationSeconds ?? 3_600)

  await write(fixture.elections, fixture.electionsArtifact.abi, 'createElection', [
    input.title ?? 'E2E Board Election',
    'A deterministic election used by the browser acceptance suite.',
    BigInt(startDate),
    BigInt(endDate),
    3n,
    input.candidates,
    input.voters
  ])

  return startDate
}

export async function makeElectionActive(seconds = 61): Promise<void> {
  await publicClient.request({ method: 'evm_increaseTime', params: [seconds] } as never)
  await publicClient.request({ method: 'evm_mine' } as never)
}

export async function advanceE2ETimeTo(timestamp: bigint): Promise<void> {
  const currentTimestamp = (await publicClient.getBlock()).timestamp
  if (timestamp <= currentTimestamp) return
  await publicClient.request({
    method: 'evm_setNextBlockTimestamp',
    params: [Number(timestamp)]
  } as never)
  await publicClient.request({ method: 'evm_mine' } as never)
}

export async function publishElectionResults(
  fixture: ElectionsE2EFixture,
  electionId = 1n
): Promise<void> {
  await write(fixture.elections, fixture.electionsArtifact.abi, 'publishResults', [electionId])
}

/**
 * Prepare a production-shaped three-seat Board through the real Elections and
 * Board contracts. This is scenario setup: the browser journey under test
 * still owns every dividend action and approval.
 */
export async function establishBoardThroughElection(
  fixture: ElectionsE2EFixture,
  candidates: readonly Address[]
): Promise<void> {
  await createElectionFixture(fixture, {
    candidates,
    voters: [E2E_OWNER],
    startDelaySeconds: 60,
    durationSeconds: 60,
    title: 'E2E Dividend Board'
  })
  const election = await electionDetails(fixture)
  await advanceE2ETimeTo(election[5] + 1n)
  await publishElectionResults(fixture)
}

export async function castOwnerVote(
  fixture: ElectionsE2EFixture,
  candidate: Address
): Promise<void> {
  await write(fixture.elections, fixture.electionsArtifact.abi, 'castVote', [1n, candidate])
}

export async function voterChoice(fixture: ElectionsE2EFixture, voter: Address): Promise<Address> {
  return publicClient.readContract({
    address: fixture.elections,
    abi: fixture.electionsArtifact.abi,
    functionName: 'getVoterChoice',
    args: [1n, voter]
  }) as Promise<Address>
}

export async function voteCount(fixture: ElectionsE2EFixture): Promise<bigint> {
  return publicClient.readContract({
    address: fixture.elections,
    abi: fixture.electionsArtifact.abi,
    functionName: 'getVoteCount',
    args: [1n]
  }) as Promise<bigint>
}

export async function electionDetails(
  fixture: ElectionsE2EFixture
): Promise<readonly [bigint, string, string, Address, bigint, bigint, bigint, boolean]> {
  return publicClient.readContract({
    address: fixture.elections,
    abi: fixture.electionsArtifact.abi,
    functionName: 'getElection',
    args: [1n]
  }) as Promise<readonly [bigint, string, string, Address, bigint, bigint, bigint, boolean]>
}

export async function eligibleVoters(fixture: ElectionsE2EFixture): Promise<readonly Address[]> {
  return publicClient.readContract({
    address: fixture.elections,
    abi: fixture.electionsArtifact.abi,
    functionName: 'getElectionEligibleVoters',
    args: [1n]
  }) as Promise<readonly Address[]>
}

export async function electionCandidates(
  fixture: ElectionsE2EFixture
): Promise<readonly Address[]> {
  return publicClient.readContract({
    address: fixture.elections,
    abi: fixture.electionsArtifact.abi,
    functionName: 'getElectionCandidates',
    args: [1n]
  }) as Promise<readonly Address[]>
}

export async function currentBoard(fixture: ElectionsE2EFixture): Promise<readonly Address[]> {
  return publicClient.readContract({
    address: fixture.board,
    abi: fixture.boardArtifact.abi,
    functionName: 'getBoardOfDirectors'
  }) as Promise<readonly Address[]>
}

export async function boardActionCount(fixture: ElectionsE2EFixture): Promise<bigint> {
  return publicClient.readContract({
    address: fixture.board,
    abi: fixture.boardArtifact.abi,
    functionName: 'getActionCount'
  }) as Promise<bigint>
}

export async function boardAction(
  fixture: ElectionsE2EFixture,
  actionId: bigint
): Promise<BoardActionState> {
  return publicClient.readContract({
    address: fixture.board,
    abi: fixture.boardArtifact.abi,
    functionName: 'getActions',
    args: [actionId]
  }) as Promise<BoardActionState>
}

export async function boardActionAddedEvents(fixture: ElectionsE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.board,
    abi: fixture.boardArtifact.abi,
    eventName: 'ActionAdded',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function boardApprovalEvents(fixture: ElectionsE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.board,
    abi: fixture.boardArtifact.abi,
    eventName: 'Approval',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function boardActionExecutedEvents(fixture: ElectionsE2EFixture) {
  return publicClient.getContractEvents({
    address: fixture.board,
    abi: fixture.boardArtifact.abi,
    eventName: 'ActionExecuted',
    fromBlock: 0n,
    toBlock: 'latest'
  })
}

export async function nextElectionId(fixture: ElectionsE2EFixture): Promise<bigint> {
  return publicClient.readContract({
    address: fixture.elections,
    abi: fixture.electionsArtifact.abi,
    functionName: 'getNextElectionId'
  }) as Promise<bigint>
}
