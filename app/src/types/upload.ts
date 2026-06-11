import { z } from 'zod'

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

/** Schemas **/
export interface FileSchemaOptions {
  /** Allowed lower-cased extensions, dot included (e.g. ['.png']). */
  allowedExtensions: readonly string[]
  /** Allowed MIME types (e.g. ['image/png']). */
  allowedMimeTypes: readonly string[]
  /** Maximum size in bytes. Defaults to MAX_FILE_SIZE. */
  maxSize?: number
  /** Error message when the file type is not allowed. */
  typeErrorMessage: string
  /** Error message when the file is too large. Defaults to a size-derived message. */
  sizeErrorMessage?: string
}

/**
 * Single source of the file-validation shape: the value must be a `File` whose
 * type is allowed (by MIME type, with an extension fallback) and within the size
 * limit. Wrap the result with `z.array(...)` for multi-file inputs.
 */
export const createFileSchema = ({
  allowedExtensions,
  allowedMimeTypes,
  maxSize = MAX_FILE_SIZE,
  typeErrorMessage,
  sizeErrorMessage = `File exceeds the ${maxSize / (1024 * 1024)} MB limit`
}: FileSchemaOptions) =>
  z
    .instanceof(File)
    .refine(
      (file) =>
        allowedMimeTypes.includes(file.type) ||
        allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext)),
      { message: typeErrorMessage }
    )
    .refine((file) => file.size <= maxSize, { message: sizeErrorMessage })

/** Types **/
export interface PreviewFile {
  previewUrl: string
  file: File
  isImage: boolean
  fileName: string
  fileSize: number
  fileType: string
}
