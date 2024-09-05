import { ref } from 'vue'
import { BoDService } from '@/services/bodService'
const bodService = new BoDService()

export function useDeployBoDContract() {
  const contractAddress = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function deploy(teamId: string, votingAddress: string) {
    try {
      loading.value = true
      contractAddress.value = await bodService.createBODContract(teamId, votingAddress)
      console.log('contractAddress', contractAddress.value)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: deploy, isLoading: loading, isSuccess, error, contractAddress }
}
export function useGetBoardOfDirectors() {
  const boardOfDirectors = ref<string[] | null>(null)
  const loading = ref(false)
  const error = ref<any>(null)
  const isSuccess = ref(false)

  async function getBoardOfDirectors(bodAddress: string) {
    try {
      loading.value = true
      boardOfDirectors.value = await bodService.getBoardOfDirectors(bodAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getBoardOfDirectors, isLoading: loading, isSuccess, error, boardOfDirectors }
}
