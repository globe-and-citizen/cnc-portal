import apiClient from '@/lib/axios'

type UploadedFileResponse = {
  fileUrl: string
  fileKey: string
  metadata: {
    key: string
    fileType: string
    fileSize: number
  }
}

type UploadFilesApiResponse = {
  files: UploadedFileResponse[]
  count: number
}

export const uploadFileApi = async (files: File[]) => {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append('files', file)
  })

  const { data } = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })

  return data as UploadFilesApiResponse
}
