import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadSingleFile } from '../file.queries'
import { mockUploadFileApi } from '@/tests/mocks/api.mock'

describe('uploadSingleFile', () => {
  const file = new File([new Uint8Array(8)], 'avatar.png', { type: 'image/png' })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUploadFileApi.mockReset()
  })

  it('uploads the file and returns its public URL', async () => {
    const url = 'https://storage.railway.app/avatar.png'
    mockUploadFileApi.mockResolvedValue({ files: [{ fileUrl: url }], count: 1 })

    await expect(uploadSingleFile(file)).resolves.toBe(url)
    expect(mockUploadFileApi).toHaveBeenCalledWith([file])
  })

  it('throws when the response has no files', async () => {
    mockUploadFileApi.mockResolvedValue({ files: [], count: 0 })

    await expect(uploadSingleFile(file)).rejects.toThrow('Upload response missing fileUrl')
  })

  it('throws when the first file has no fileUrl', async () => {
    mockUploadFileApi.mockResolvedValue({ files: [{ fileUrl: '' }], count: 1 })

    await expect(uploadSingleFile(file)).rejects.toThrow('Upload response missing fileUrl')
  })

  it('propagates an upload API rejection', async () => {
    mockUploadFileApi.mockRejectedValue(new Error('Network error'))

    await expect(uploadSingleFile(file)).rejects.toThrow('Network error')
  })
})
