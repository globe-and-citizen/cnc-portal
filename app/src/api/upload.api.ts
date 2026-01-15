import apiClient from '@/lib/axios'

export const uploadFileApi = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return data
}
