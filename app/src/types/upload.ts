/** Constants **/
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
export const MAX_FILES = 10

// Allowed file types
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp']
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.txt', '.zip', '.docx']
export const ACCEPTED_FILE_TYPES = [
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_DOCUMENT_EXTENSIONS
].join(',')

export const ALLOWED_IMAGE_MIMETYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
export const ALLOWED_DOCUMENT_MIMETYPES = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
export const ALLOWED_MIMETYPES = [...ALLOWED_IMAGE_MIMETYPES, ...ALLOWED_DOCUMENT_MIMETYPES]

/** Types **/
export interface PreviewFile {
  previewUrl: string
  file: File
  isImage: boolean
  fileName: string
  fileSize: number
  fileType: string
}
