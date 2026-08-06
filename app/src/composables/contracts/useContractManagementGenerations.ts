import { computed } from 'vue'
import { useGetTeamOfficersQuery } from '@/queries/contract.queries'
import { useTeamStore } from '@/stores'

export interface ContractGeneration {
  key: number | string
  version: string | null
  officerAddress: string
  isCurrent: boolean
  contracts: Array<{ address: string; type: string; deployer: string }>
}

export function useContractManagementGenerations() {
  const teamStore = useTeamStore()
  const officersQuery = useGetTeamOfficersQuery({
    queryParams: { teamId: () => teamStore.currentTeamId ?? '' }
  })

  const generations = computed<ContractGeneration[]>(() => {
    const officers = officersQuery.data.value ?? []

    if (officers.length) {
      return officers.map((officer) => ({
        key: officer.id,
        version: officer.version,
        officerAddress: officer.address,
        isCurrent: officer.isCurrent,
        contracts: officer.isCurrent
          ? (teamStore.currentTeam?.teamContracts ?? [])
          : officer.contracts
      }))
    }

    const currentOfficer = teamStore.currentTeam?.currentOfficer
    if (!currentOfficer) return []

    return [
      {
        key: currentOfficer.id,
        version: currentOfficer.version,
        officerAddress: currentOfficer.address,
        isCurrent: true,
        contracts: teamStore.currentTeam?.teamContracts ?? []
      }
    ]
  })

  const currentGeneration = computed(() =>
    generations.value.find((generation) => generation.isCurrent)
  )
  const legacyGenerations = computed(() =>
    generations.value.filter((generation) => !generation.isCurrent)
  )

  return {
    generations,
    currentGeneration,
    legacyGenerations,
    isPending: officersQuery.isPending,
    isError: officersQuery.isError,
    refetch: officersQuery.refetch
  }
}
