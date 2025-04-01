import { useCustomFetch } from '@/composables/useCustomFetch'
import { useToastStore, useUserDataStore } from '@/stores'
import type { Team } from '@/types/team'
import { log } from '@/utils/generalUtil'
import { defineStore } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export const useExpenseDataStore = defineStore('expense', () => {
  // TODO: fetch teams on mounted
  // Having caching system,
  // And trigger fetch on demand
  // Update cache system.

  const userDataStore = useUserDataStore()
  const route = useRoute()
  const { addErrorToast } = useToastStore()

  // const teams = ref([])
  const currentTeamId = ref<string | null>(null)
  const teamsFetched = ref<Map<string, Team>>(new Map())
  const teamURI = ref<string>(`teams/${route.params.id}/expense-data`)
  const expenseURI = ref<string>(`teams/${route.params.id}/expense-data`)

  /**
   * @description Fetch teams lists
   * @returns teams, teamsAreFetching, teamsError, executeFetchTeams
   */
  // const {
  //   isFetching: teamsAreFetching,
  //   error: teamsError,
  //   data: teams,
  //   execute: executeFetchTeams
  // } = useCustomFetch('teams', { immediate: false }).json()

  /**
   * @description Fetch team by id
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  // const {
  //   isFetching: teamIsFetching,
  //   error: teamError,
  //   data: team,
  //   execute: executeFetchTeam,
  //   statusCode
  // } = useCustomFetch(teamURI, { immediate: false }).json()

  /**
   * @description Fetch team by id
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  const {
    isFetching: expenseDataIsFetching,
    error: expenseDataError,
    data: expenseData,
    execute: executeFetchExpenseData,
    statusCode
  } = useCustomFetch(expenseURI, {
    immediate: false,
    beforeFetch: async ({ options, url, cancel }) => {
      options.headers = {
        memberaddress: userDataStore.address,
        'Content-Type': 'application/json',
        ...options.headers
      }
      return { options, url, cancel }
    }
  })
    .get()
    .json()

  /**
   * @description Fetch team by id and update the team cache
   * @param teamId
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  // const fetchTeam = async (teamId: string) => {
  //   teamURI.value = `teams/${teamId}`
  //   await executeFetchTeam()
  //   if (team.value) {
  //     teamsFetched.value.set(String(team.value.id), team.value)
  //   } else {
  //     log.error('Team is falsy')
  //   }
  //   return {
  //     teamIsFetching,
  //     teamError,
  //     team
  //   }
  // }

  /**
   * @description Fetch user dat by id and update the team cache
   * @param teamId
   * @returns team, teamIsFetching, teamError, executeFetchTeam
   */
  const fetchExpenseData = async (teamId: string) => {
    teamURI.value = `teams/${teamId}/expense-data`
    await executeFetchExpenseData()
    // if (expenseData.value) {
    //   teamsFetched.value.set(String(team.value.id), team.value)
    // } else {
    //   log.error('Team is falsy')
    // }
    return {
      expenseDataIsFetching, //teamIsFetching,
      expenseDataError, //teamError,
      expenseData //team
    }
  }

  // const setCurrentTeamId = async (teamId: string) => {
  //   log.info('Setting current team id to :', teamId)
  //   if (currentTeamId.value === teamId) return
  //   currentTeamId.value = teamId
  //   await fetchTeam(currentTeamId.value)
  // }
  const currentTeam = computed(() => {
    return currentTeamId.value ? teamsFetched.value.get(String(currentTeamId.value)) : undefined
  })

  // watch(teams, (newTeamsVal) => {
  //   // set the current team id to the first team id if not already set and teams is not empty
  //   if (!currentTeamId.value && newTeamsVal.length > 0) {
  //     log.info('new Val', newTeamsVal)
  //     log.info('Current team id not set, setting to first team id:', newTeamsVal[0].id)
  //     setCurrentTeamId(newTeamsVal[0].id)
  //   }
  // })

  // watch(teamsError, () => {
  //   if (teamsError.value) {
  //     log.error('Failed to load user teams \n', teamsError.value)
  //     addErrorToast('Failed to load user teams')
  //   }
  // })
  // watch(teamError, () => {
  //   if (teamError.value) {
  //     log.error('Failed to load user team \n', teamError.value)
  //     addErrorToast('Failed to load user team')
  //   }
  // })
  watch(expenseDataError, (newError) => {
    if (newError) {
      log.error('Failed to load expense data \n', expenseDataError.value)
      addErrorToast('Failed to load expense data')
    }
  })

  // Check if the teams are fetching if not fetch team again
  // const reloadTeams = () => {
  //   if (teamsAreFetching.value) return
  //   else {
  //     executeFetchTeams()
  //   }
  // }

  const reloadExpenseData = async () => {
    if (expenseDataIsFetching.value) return
    else {
      // console.log('fetching expense data at: ', expenseURI.value)
      await executeFetchExpenseData()
    }
  }

  // Fetch teams on mounted
  // Todo count how many time it's called or mounted
  onMounted(async () => {
    await reloadExpenseData()
    // console.log('expenseData:', expenseData.value)
  })

  return {
    fetchExpenseData, //fetchTeam,
    expenseData, //currentTeam,
    expenseDataError,
    expenseDataIsFetching,
    statusCode
  }
})
