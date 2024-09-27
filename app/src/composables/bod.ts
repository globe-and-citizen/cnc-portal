import { ref } from 'vue'
import { BoDService } from '@/services/bodService'
const bodService = new BoDService()

export function useGetBoardOfDirectors() {
  const boardOfDirectors = ref<string[] | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
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
