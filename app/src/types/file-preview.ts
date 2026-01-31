/**
 * File preview types for FilePreviewGallery and related components
 */

/**
 * Represents a file preview item for rendering in galleries
 */
export interface FilePreviewItem {
  /** URL for previewing the file (blob URL or presigned URL) */
  previewUrl: string
  /** Display name of the file */
  fileName: string
  /** File size in bytes */
  fileSize: number
  /** MIME type of the file */
  fileType?: string
  /** Whether the file is an image (determines render mode) */
  isImage: boolean
  /** S3 key for loading presigned URLs */
  key?: string
}

/**
 * Modal type for file preview modals
 */
export type FilePreviewModalType = 'image' | 'document' | null

/**
 * Content type for file preview rendering
 */
export type FilePreviewContentType = 'pdf' | 'text' | 'other'

/**
 * State for file preview modal
 */
export interface FilePreviewModalState {
  /** Type of modal currently open */
  type: FilePreviewModalType
  /** URL of the file being previewed */
  url: string
  /** Name of the file being previewed */
  fileName: string
  /** MIME type of the file */
  fileType: string
  /** Content type for rendering decisions */
  contentType: FilePreviewContentType
  /** Text content for text file previews */
  textContent: string
}

/**
 * File attachment from API response
 */
export interface FileAttachment {
  /** MIME type of the file */
  fileType: string
  /** File size in bytes */
  fileSize: number
  /** S3 key for the file */
  fileKey: string
  /** Presigned URL for accessing the file */
  fileUrl: string
}
