import { describe, it, expect } from 'vitest'
import { createFileSchema, MAX_FILE_SIZE } from '../upload'

const makeFile = (name: string, type: string, size = 1024): File =>
  new File([new Uint8Array(size)], name, { type })

describe('createFileSchema', () => {
  const schema = createFileSchema({
    allowedExtensions: ['.png', '.jpg'],
    allowedMimeTypes: ['image/png', 'image/jpeg'],
    typeErrorMessage: 'Only images allowed'
  })

  it('accepts a file matching an allowed MIME type', () => {
    expect(schema.safeParse(makeFile('a.png', 'image/png')).success).toBe(true)
  })

  it('accepts a file matching an allowed extension when the MIME type is empty', () => {
    expect(schema.safeParse(makeFile('a.png', '')).success).toBe(true)
  })

  it('rejects a disallowed type with the provided message', () => {
    const result = schema.safeParse(makeFile('a.pdf', 'application/pdf'))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Only images allowed')
    }
  })

  it('rejects a file over the default size limit with a size-derived message', () => {
    const result = schema.safeParse(makeFile('a.png', 'image/png', MAX_FILE_SIZE + 1))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('File exceeds the 10 MB limit')
    }
  })

  it('honours a custom maxSize and sizeErrorMessage', () => {
    const small = createFileSchema({
      allowedExtensions: ['.png'],
      allowedMimeTypes: ['image/png'],
      maxSize: 1024,
      typeErrorMessage: 'nope',
      sizeErrorMessage: 'too big'
    })
    const result = small.safeParse(makeFile('a.png', 'image/png', 2048))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('too big')
    }
  })

  it('rejects a value that is not a File', () => {
    expect(schema.safeParse('not a file').success).toBe(false)
  })
})
