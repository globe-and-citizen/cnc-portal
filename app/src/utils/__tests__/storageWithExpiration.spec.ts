import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLocalStorageWithExpiration } from '../storageWithExpiration'

describe('createLocalStorageWithExpiration', () => {
  let mockLocalStorage: Storage
  let storageWithExpiration: ReturnType<typeof createLocalStorageWithExpiration>

  beforeEach(() => {
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0
    }
    localStorage = mockLocalStorage as unknown as Storage
    storageWithExpiration = createLocalStorageWithExpiration()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should set an item with an expiry time', () => {
    const key = 'testKey'
    const value = JSON.stringify({ data: 'testValue' })
    const now = new Date()
    vi.setSystemTime(now)

    storageWithExpiration.setItem(key, value)

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      key,
      JSON.stringify({
        value: JSON.parse(value),
        expiry: now.getTime() + 24 * 60 * 60 * 1000
      })
    )
  })

  it('should retrieve an item if it has not expired', () => {
    const key = 'testKey'
    const value = { data: 'testValue' }
    const now = new Date()
    const expiry = now.getTime() + 24 * 60 * 60 * 1000
    vi.setSystemTime(now)

    mockLocalStorage.getItem = vi.fn().mockReturnValue(
      JSON.stringify({
        value,
        expiry
      })
    )

    const result = storageWithExpiration.getItem(key)

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(key)
    expect(result).toEqual(JSON.stringify(value))
  })

  it('should return null and remove the item if it has expired', () => {
    const key = 'testKey'
    const value = { data: 'testValue' }
    const now = new Date()
    const expiry = now.getTime() - 1000 // Expired 1 second ago
    vi.setSystemTime(now)

    mockLocalStorage.getItem = vi.fn().mockReturnValue(
      JSON.stringify({
        value,
        expiry
      })
    )

    const result = storageWithExpiration.getItem(key)

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(key)
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key)
    expect(result).toBeNull()
  })

  it('should return null if the item does not exist', () => {
    const key = 'nonExistentKey'

    mockLocalStorage.getItem = vi.fn().mockReturnValue(null)

    const result = storageWithExpiration.getItem(key)

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(key)
    expect(result).toBeNull()
  })

  it('should remove an item', () => {
    const key = 'testKey'

    storageWithExpiration.removeItem(key)

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key)
  })

  it('should handle errors when setting an item', () => {
    const key = 'testKey'
    const value = JSON.stringify({ data: 'testValue' })
    mockLocalStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage error')
    })

    expect(() => storageWithExpiration.setItem(key, value)).not.toThrow()
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(key, expect.any(String))
  })

  it('should handle errors when getting an item', () => {
    const key = 'testKey'
    mockLocalStorage.getItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage error')
    })

    const result = storageWithExpiration.getItem(key)

    expect(result).toBeNull()
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith(key)
  })

  it('should handle errors when removing an item', () => {
    const key = 'testKey'
    mockLocalStorage.removeItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage error')
    })

    expect(() => storageWithExpiration.removeItem(key)).not.toThrow()
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(key)
  })
})
