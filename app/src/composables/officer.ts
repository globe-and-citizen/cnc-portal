import { ref } from 'vue'
import { OfficerService } from '@/services/officerService'

const officerService = new OfficerService()

export function useDeployOfficerContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function deployOfficer(teamId: string) {
    try {
      console.log('deployOfficer')
      loading.value = true
      contractAddress.value = await officerService.createOfficerContract(teamId)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deployOfficer, isLoading: loading, isSuccess, error, contractAddress }
}
export function useCreateTeam() {
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function createTeam(officerAddress: string, founders: string[], members: string[]) {
    try {
      loading.value = true
      await officerService.createTeam(officerAddress, founders, members)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: createTeam, isLoading: loading, isSuccess, error }
}
export function useGetOfficerTeam() {
  const officerTeam = ref<{
    founders: string[]
    members: string[]
    bankAddress: string
    votingAddress: string
  } | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function getOfficerTeam(officerAddress: string) {
    try {
      loading.value = true
      officerTeam.value = await officerService.getOfficerTeam(officerAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getOfficerTeam, isLoading: loading, isSuccess, error, officerTeam }
}

export function useDeployBank() {
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function deployBank(officerAddress: string) {
    try {
      loading.value = true
      await officerService.deployBank(officerAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deployBank, isLoading: loading, isSuccess, error }
}

export function useDeployVoting() {
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function deployVoting(officerAddress: string) {
    try {
      loading.value = true
      await officerService.deployVoting(officerAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deployVoting, isLoading: loading, isSuccess, error }
}
