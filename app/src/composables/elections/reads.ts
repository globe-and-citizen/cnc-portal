import { useQuery } from '@tanstack/vue-query'
import { readContract } from '@wagmi/core'
import { computed, unref, type MaybeRef, type Ref } from 'vue'
import { useReadContract } from '@wagmi/vue'
import { isAddress, zeroAddress, type Address } from 'viem'
import { config } from '@/wagmi.config'
import { useTeamStore } from '@/stores'
import { electionsAbi } from '@/artifacts/abi/generated'
import type { RawElection } from '@/utils/elections/election'

/**
 * Every read below restates the type Elections.sol promises, because wagmi's Vue
 * bindings widen `data` to `unknown` as soon as the parameters are refs — and
 * refs are the point here, since the contract address only arrives once the team
 * has loaded. The casts live in this file so no call site has to make one.
 */

/**
 * Address of the team's Elections contract.
 */
export function useElectionsAddress() {
  const teamStore = useTeamStore()
  return computed(() => teamStore.getContractAddressByType('Elections'))
}

/**
 * The contract every Elections read points at, plus the flag saying it is usable.
 *
 * The address travels to wagmi as a ref, never as `.value`: on a page reload the
 * team's contracts land after setup has already run, and a read pinned to a
 * frozen `undefined` address never recovers.
 */
function useElectionsTarget() {
  const address = useElectionsAddress()
  const isAddressReady = computed(() => !!address.value && isAddress(address.value))
  return { address, isAddressReady }
}

/**
 * The same target narrowed to one election. Election ids start at 1, so a falsy
 * id means the page has not resolved one yet rather than a real election.
 */
function useElectionTarget(electionId: MaybeRef<bigint>) {
  const { address, isAddressReady } = useElectionsTarget()
  const id = computed(() => unref(electionId))
  const enabled = computed(() => isAddressReady.value && !!id.value)
  return { address, id, enabled }
}

/**
 * An account passed to the contract as an argument.
 *
 * `arg` always holds an address because the query key needs a concrete value;
 * `isReady` is what keeps the read from ever running against the placeholder.
 */
function useAccountArg(account: MaybeRef<Address | undefined>) {
  const value = computed(() => unref(account))
  const arg = computed(() => value.value ?? zeroAddress)
  const isReady = computed(() => !!value.value && isAddress(value.value))
  return { arg, isReady }
}

export type CandidateVoteCounts = Readonly<Record<Address, bigint>>

/**
 * Owner of the Elections contract — the only account allowed to open an
 * election or publish its results.
 */
export function useElectionsOwner() {
  const { address, isAddressReady } = useElectionsTarget()

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'owner',
    query: { enabled: isAddressReady }
  })

  return { ...query, data: query.data as Ref<Address | undefined> }
}

/**
 * Id the next election will be given. The most recent election is therefore this
 * minus one, and a value of 1 means the team has never run one.
 */
export function useElectionsNextElectionId() {
  const { address, isAddressReady } = useElectionsTarget()

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'getNextElectionId',
    query: { enabled: isAddressReady }
  })

  return { ...query, data: query.data as Ref<bigint | undefined> }
}

/**
 * Election details by id.
 */
export function useElectionsGetElection(electionId: MaybeRef<bigint>) {
  const { address, id, enabled } = useElectionTarget(electionId)

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'getElection',
    args: [id],
    query: { enabled }
  })

  return { ...query, data: query.data as Ref<RawElection | undefined> }
}

/**
 * Total votes cast in an election, across every candidate.
 */
export function useElectionsGetVoteCount(electionId: MaybeRef<bigint>) {
  const { address, id, enabled } = useElectionTarget(electionId)

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'getVoteCount',
    args: [id],
    query: { enabled }
  })

  return { ...query, data: query.data as Ref<bigint | undefined> }
}

/**
 * Vote counts for every candidate, read together and cached as one query.
 * The configured transport batches these concurrent calls without requiring a
 * Multicall contract in local development. Candidate cards receive the values
 * as props; they must never create a contract query of their own.
 */
export function useElectionsGetCandidateVoteCounts(
  electionId: MaybeRef<bigint>,
  candidates: MaybeRef<readonly Address[] | undefined>
) {
  const { address, id, enabled } = useElectionTarget(electionId)
  const candidateAddresses = computed(() => unref(candidates) ?? [])

  const query = useQuery({
    queryKey: computed(
      () =>
        [
          'electionCandidateVoteCounts',
          {
            address: address.value?.toLowerCase(),
            electionId: id.value.toString(),
            candidates: candidateAddresses.value.map((candidate) => candidate.toLowerCase())
          }
        ] as const
    ),
    enabled: computed(() => enabled.value && candidateAddresses.value.length > 0),
    queryFn: async (): Promise<CandidateVoteCounts> => {
      const electionAddress = address.value
      if (!electionAddress) return {}

      const counts = await Promise.all(
        candidateAddresses.value.map((candidate) =>
          readContract(config, {
            address: electionAddress,
            abi: electionsAbi,
            functionName: 'getVoteCounts' as const,
            args: [id.value, candidate] as const
          })
        )
      )

      return Object.fromEntries(
        candidateAddresses.value.map((candidate, index) => [candidate, counts[index] ?? 0n])
      ) as CandidateVoteCounts
    }
  })

  return { ...query, data: query.data as Ref<CandidateVoteCounts | undefined> }
}

/**
 * Candidates standing in an election.
 */
export function useElectionsGetCandidates(electionId: MaybeRef<bigint>) {
  const { address, id, enabled } = useElectionTarget(electionId)

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'getElectionCandidates',
    args: [id],
    query: { enabled }
  })

  return { ...query, data: query.data as Ref<readonly Address[] | undefined> }
}

/**
 * Voters an election was opened to — a snapshot taken when it was created.
 */
export function useElectionsGetEligibleVoters(electionId: MaybeRef<bigint>) {
  const { address, id, enabled } = useElectionTarget(electionId)

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'getElectionEligibleVoters',
    args: [id],
    query: { enabled }
  })

  return { ...query, data: query.data as Ref<readonly Address[] | undefined> }
}

/**
 * Winners recorded when the results were published. Empty until then.
 */
export function useElectionsGetWinners(electionId: MaybeRef<bigint>) {
  const { address, id, enabled } = useElectionTarget(electionId)

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'getElectionWinners',
    args: [id],
    query: { enabled }
  })

  return { ...query, data: query.data as Ref<readonly Address[] | undefined> }
}

/**
 * Provisional standings computed from the votes cast so far. These are not a
 * result: only `useElectionsGetWinners` reports one the team has published.
 */
export function useElectionsGetResults(electionId: MaybeRef<bigint>) {
  const { address, id, enabled } = useElectionTarget(electionId)

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'getElectionResults',
    args: [id],
    query: { enabled }
  })

  return { ...query, data: query.data as Ref<readonly Address[] | undefined> }
}

/**
 * Whether a voter has already cast their vote in an election.
 */
export function useElectionsHasVoted(
  electionId: MaybeRef<bigint>,
  voter: MaybeRef<Address | undefined>
) {
  const { address, id, enabled } = useElectionTarget(electionId)
  const { arg: voterAddress, isReady: isVoterReady } = useAccountArg(voter)

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'hasVoted',
    args: [id, voterAddress],
    query: { enabled: computed(() => enabled.value && isVoterReady.value) }
  })

  return { ...query, data: query.data as Ref<boolean | undefined> }
}

/**
 * Candidate a voter picked, or the zero address if they have not voted.
 */
export function useElectionsGetVoterChoice(
  electionId: MaybeRef<bigint>,
  voter: MaybeRef<Address | undefined>
) {
  const { address, id, enabled } = useElectionTarget(electionId)
  const { arg: voterAddress, isReady: isVoterReady } = useAccountArg(voter)

  const query = useReadContract({
    address,
    abi: electionsAbi,
    functionName: 'getVoterChoice',
    args: [id, voterAddress],
    query: { enabled: computed(() => enabled.value && isVoterReady.value) }
  })

  return { ...query, data: query.data as Ref<Address | undefined> }
}
