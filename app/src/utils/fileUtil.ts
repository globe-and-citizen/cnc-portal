/**
 * File utility functions for file handling, icons, and formatting
 */

/**
 * Icon mapping for common file extensions
 */
export const FILE_ICON_MAP: Record<string, string> = {
  pdf: 'heroicons:document-text',
  zip: 'heroicons:archive-box',
  docx: 'heroicons:document',
  doc: 'heroicons:document',
  txt: 'heroicons:document-text',
  csv: 'heroicons:table-cells',
  json: 'heroicons:code-bracket',
  xml: 'heroicons:code-bracket',
  xls: 'heroicons:table-cells',
  xlsx: 'heroicons:table-cells',
  ppt: 'heroicons:presentation-chart-bar',
  pptx: 'heroicons:presentation-chart-bar',
  mp3: 'heroicons:musical-note',
  mp4: 'heroicons:film',
  mov: 'heroicons:film',
  avi: 'heroicons:film'
} as const

/**
 * Default icon for unknown file types
 */
export const DEFAULT_FILE_ICON = 'heroicons:paper-clip'

/**
 * Maximum filename length for display (with truncation)
 */
export const MAX_FILENAME_DISPLAY_LENGTH = 15

/**
 * Extracts file extension from a filename
 * @param fileName - The filename to extract extension from
 * @returns Lowercase file extension or empty string
 */
export const getFileExtension = (fileName: string): string => {
  if (!fileName || typeof fileName !== 'string') return ''
  const parts = fileName.split('.')
  if (parts.length < 2) return ''
  return parts.pop()?.toLowerCase() || ''
}

/**
 * Returns the appropriate icon for a file based on its extension
 * @param fileName - The filename to get icon for
 * @returns Icon name string
 */
export const getFileIcon = (fileName: string): string => {
  const extension = getFileExtension(fileName)
  return FILE_ICON_MAP[extension] || DEFAULT_FILE_ICON
}

/**
 * Truncates a filename while preserving the extension
 * @param name - The filename to truncate
 * @param maxLength - Maximum length (default: MAX_FILENAME_DISPLAY_LENGTH)
 * @returns Truncated filename with extension
 */
export const truncateFileName = (name: string, maxLength = MAX_FILENAME_DISPLAY_LENGTH): string => {
  if (!name || typeof name !== 'string') return ''
  if (name.length <= maxLength) return name

  const extension = getFileExtension(name)
  if (!extension) {
    return name.slice(0, maxLength - 3) + '...'
  }

  const nameWithoutExt = name.slice(0, name.length - extension.length - 1)
  const availableLength = maxLength - extension.length - 4 // 4 = "..." + "."

  if (availableLength <= 0) {
    return `...${extension}`
  }

  return `${nameWithoutExt.slice(0, availableLength)}...${extension}`
}

/**
 * Content type for file preview rendering
 */
export type FileContentType = 'pdf' | 'text' | 'image' | 'other'

/**
 * Text file extensions for content type detection
 */
const TEXT_EXTENSIONS = ['txt', 'csv', 'json', 'xml', 'log', 'md', 'yml', 'yaml']

/**
 * Image file extensions
 */
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']

/**
 * Detects the content type of a file for preview purposes
 * @param fileName - The filename
 * @param mimeType - Optional MIME type (takes precedence)
 * @returns Content type for rendering decisions
 */
export const detectFileContentType = (fileName: string, mimeType?: string): FileContentType => {
  // MIME type takes precedence if available
  if (mimeType) {
    if (mimeType.includes('pdf')) return 'pdf'
    if (mimeType.startsWith('text/')) return 'text'
    if (mimeType.startsWith('image/')) return 'image'
  }

  const extension = getFileExtension(fileName)
  if (!extension) return 'other'

  if (extension === 'pdf') return 'pdf'
  if (TEXT_EXTENSIONS.includes(extension)) return 'text'
  if (IMAGE_EXTENSIONS.includes(extension)) return 'image'

  return 'other'
}

/**
 * Common image MIME types
 */
export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml'
] as const

/**
 * Checks if a MIME type represents an image
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type is an image type
 */
export const isImageMimeType = (mimeType: string): boolean => {
  return IMAGE_MIME_TYPES.includes(mimeType as (typeof IMAGE_MIME_TYPES)[number])
}

/**
 * Extracts the display name from a file key/path
 * @param fileKey - The file key or path
 * @returns The basename of the file
 */
export const getFileDisplayName = (fileKey: string): string => {
  if (!fileKey || typeof fileKey !== 'string') return 'file'
  return fileKey.split('/').pop() || 'file'
}
