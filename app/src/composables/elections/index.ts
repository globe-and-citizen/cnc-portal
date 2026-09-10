import { computed, inject, provide, watch, type ComputedRef, type InjectionKey } from 'vue'
import { useNow } from '@vueuse/core'
import { log } from '@/lib/logging'
import { toElection } from '@/utils/elections/election'
import {
  useElectionsAddress,
  useElectionsOwner,
  useElectionsGetElection,
  useElectionsGetVoteCount,
  useElectionsGetCandidates,
  useElectionsGetEligibleVoters
} from './reads'

export * from './reads'
export * from './writes'

function createBoDElections(currentElectionId: ComputedRef<bigint>) {
  const electionsAddress = useElectionsAddress()

  const { data: owner } = useElectionsOwner()

  const { data: currentElection, error: errorGetCurrentElection } =
    useElectionsGetElection(currentElectionId)

  const { data: voteCount, error: errorGetVoteCount } = useElectionsGetVoteCount(currentElectionId)

  const { data: candidateList, error: errorGetCandidates } =
    useElectionsGetCandidates(currentElectionId)

  const { data: voterList } = useElectionsGetEligibleVoters(currentElectionId)

  const formattedElection = computed(() => {
    const election = toElection(currentElection.value)
    if (!election) return null

    return {
      ...election,
      votesCast: Number(voteCount.value ?? 0),
      candidates: candidateList.value?.length ?? 0,
      voters: voterList.value?.length ?? 0
    }
  })

  const now = useNow({ interval: 1000 })

  const timeLeft = computed(() => {
    if (!formattedElection.value) return { toStart: 0, toEnd: 0 }
    const startDate = formattedElection.value.startDate
    const endDate = formattedElection.value.endDate
    return {
      toStart: Math.max(0, Math.floor((startDate.getTime() - now.value.getTime()) / 1000)),
      toEnd: Math.max(0, Math.floor((endDate.getTime() - now.value.getTime()) / 1000))
    }
  })

  // `now` already ticks once a second, so these follow on their own — a second
  // interval copying them into refs would only duplicate that timer.
  const leftToStart = computed(() => timeLeft.value.toStart)
  const leftToEnd = computed(() => timeLeft.value.toEnd)

  const electionStatus = computed(() => {
    if (!formattedElection.value) return null
    if (leftToStart.value > 0) return { text: 'Upcoming', color: 'warning' }
    if (formattedElection.value.voters !== formattedElection.value.votesCast && leftToEnd.value > 0)
      return { text: 'Active', color: 'success' }
    return { text: 'Completed', color: 'neutral' }
  })

  watch(errorGetCurrentElection, (error) => {
    if (error) {
      log.error('errorGetCurrentElection.value:', error)
    }
  })

  watch(errorGetVoteCount, (error) => {
    if (error) {
      log.error('errorGetVoteCount.value:', error)
    }
  })

  watch(errorGetCandidates, (error) => {
    if (error) {
      log.error('errorGetCandidates.value:', error)
    }
  })

  return {
    formattedElection,
    electionStatus,
    leftToStart,
    leftToEnd,
    currentElectionId,
    electionsAddress,
    owner,
    candidateList,
    voteCount,
    voterList
  }
}

export type BoDElections = ReturnType<typeof createBoDElections>

const BoDElectionsKey: InjectionKey<BoDElections> = Symbol('BoDElections')

/**
 * Shares the one election read and one-second clock a details page owns with
 * its summary, actions and candidate cards.
 */
export function provideBoDElections(election: BoDElections) {
  provide(BoDElectionsKey, election)
}

/**
 * Composable for Board of Directors Elections with formatted data and computed properties
 * @param currentElectionId - Computed reference to the current election ID
 */
export const useBoDElections = (currentElectionId: ComputedRef<bigint>) => {
  return inject(BoDElectionsKey, null) ?? createBoDElections(currentElectionId)
}
