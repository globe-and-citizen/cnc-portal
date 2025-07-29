import { computed, ref, watch, type ComputedRef } from 'vue'
import { useReadContract } from '@wagmi/vue'
import ElectionABI from '@/artifacts/abi/elections.json'
import { useTeamStore } from '@/stores'
import { useCountdown } from '@vueuse/core'
import { log } from '@/utils'

export const useBoDElections = (currentElectionId: ComputedRef<bigint>) => {
  const teamSTore = useTeamStore()
  const electionsAddress = computed(() => teamSTore.getContractAddressByType('Elections'))

  // Composables
  const { data: currentElection, error: errorGetCurrentElection } = useReadContract({
    functionName: 'getElection',
    address: electionsAddress.value,
    abi: ElectionABI,
    args: [currentElectionId], // Supply currentElectionId as an argument
    query: {
      enabled: computed(() => !!currentElectionId.value) // Only fetch if currentElectionId is available
    }
  })

  const { data: voteCount, error: errorGetVoteCount } = useReadContract({
    functionName: 'getVoteCount',
    address: electionsAddress.value,
    abi: ElectionABI,
    args: [currentElectionId], // Supply currentElectionId as an argument
    query: {
      enabled: computed(() => !!currentElectionId.value) // Only fetch if currentElectionId is available
    }
  })

  const { data: candidateList, error: errorGetCandidates } = useReadContract({
    functionName: 'getElectionCandidates',
    address: electionsAddress.value,
    abi: ElectionABI,
    args: [currentElectionId],
    query: {
      enabled: computed(() => !!currentElectionId.value) // Only fetch if currentElectionId is available
    }
  })

  const { data: voterList } = useReadContract({
    functionName: 'getElectionEligibleVoters',
    address: electionsAddress.value,
    abi: ElectionABI,
    args: [currentElectionId],
    query: {
      enabled: computed(() => !!currentElectionId.value)
    }
  })

  // Computed Properties
  const formattedElection = computed(() => {
    if (!currentElection.value) return null
    const raw = currentElection.value as Array<string | bigint | boolean>
    return {
      id: Number(raw[0]),
      title: String(raw[1]),
      description: String(raw[2]),
      createdBy: String(raw[3]),
      startDate: new Date(Number(raw[4]) * 1000),
      endDate: new Date(Number(raw[5]) * 1000),
      seatCount: Number(raw[6]),
      resultsPublished: Boolean(raw[7]),
      votesCast: Number(voteCount.value || 0),
      candidates: (candidateList.value as string[])?.length,
      voters: (voterList.value as string[])?.length || 0
    }
  })

  const now = ref(new Date())

  const timeLeft = computed(() => {
    if (!formattedElection.value) return { toStart: 0, toEnd: 0 }
    const startDate = formattedElection.value.startDate
    const endDate = formattedElection.value.endDate
    return {
      toStart: Math.max(0, Math.floor((startDate.getTime() - now.value.getTime()) / 1000)),
      toEnd: Math.max(0, Math.floor((endDate.getTime() - now.value.getTime()) / 1000))
    }
  })

  const { remaining: leftToStart } = useCountdown(timeLeft.value.toStart, {
    immediate: true
  })

  const { remaining: leftToEnd } = useCountdown(timeLeft.value.toEnd, {
    immediate: true
  })

  const electionStatus = computed(() => {
    if (!formattedElection.value || formattedElection.value.resultsPublished)
      return { text: 'No Election' }
    if (leftToStart.value > 0) return { text: 'Upcoming', color: 'warning' }
    if (formattedElection.value.voters !== formattedElection.value.votesCast && leftToEnd.value > 0)
      return { text: 'Active', color: 'success' }
    return { text: 'Completed', color: 'neutral' }
  })

  // Watchers
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
    electionsAddress
  }
}
