import { describe, it, expect, beforeEach, vi } from 'vitest'
import { uploadFileApi } from '../upload.api'
import apiClient from '@/lib/axios'

describe('uploadFileApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upload a single file successfully', async () => {
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    const mockResponse = {
      files: [
        {
          fileUrl: 'https://example.com/test.txt',
          fileKey: 'file-key-123',
          metadata: {
            key: 'file-key-123',
            fileType: 'text/plain',
            fileSize: 12
          }
        }
      ],
      count: 1
    }

    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse })

    const result = await uploadFileApi([mockFile])

    expect(result).toEqual(mockResponse)
    expect(apiClient.post).toHaveBeenCalledOnce()
    expect(apiClient.post).toHaveBeenCalledWith('/upload', expect.any(FormData), {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  })

 
  

  

 

  

  
    
})
