import apiClient from '@/lib/axios'

type FileUrlResponse = {
  url: string
  expiresIn: number
}

export const getFileUrlApi = async (key: string, expiresIn?: number): Promise<FileUrlResponse> => {
  const params: Record<string, string | number> = { key }
  if (expiresIn) params.expiresIn = expiresIn

  const { data } = await apiClient.get<FileUrlResponse>('/file/url', { params })
  return data
}
