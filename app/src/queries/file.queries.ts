import { useMutation } from '@tanstack/vue-query'
import { uploadFileApi } from '@/api'

/**
 * Upload a single file and return its public URL.
 * Throws when the backend response carries no fileUrl.
 */
export async function uploadSingleFile(file: File): Promise<string> {
  const response = await uploadFileApi([file])
  const fileUrl = response?.files?.[0]?.fileUrl
  if (!fileUrl) throw new Error('Upload response missing fileUrl')
  return fileUrl
}

/**
 * Side effects:
 *   - onSuccess: none — the caller sets the model value + shows the toast.
 *   - onError:   no toast (caller renders mutation.error via UAlert).
 */
export function useUploadFileMutation() {
  return useMutation({
    mutationFn: (file: File) => uploadSingleFile(file)
  })
}
