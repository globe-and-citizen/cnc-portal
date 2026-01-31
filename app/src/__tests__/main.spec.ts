import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import after mocks are set up
import { setupApp } from '../main'

describe('main.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create and return a Vue app instance', () => {
    const app = setupApp()

    // Verify that setupApp returns something (the app instance)
    expect(app).toBeDefined()
    expect(typeof app).toBe('object')

    // Verify that the app has the expected Vue app methods
    expect(typeof app.use).toBe('function')
    expect(typeof app.provide).toBe('function')
    expect(typeof app.component).toBe('function')
    expect(typeof app.mount).toBe('function')
  })

  it('should call necessary setup functions during app initialization', () => {
    // Test that the function runs without throwing errors
    expect(() => setupApp()).not.toThrow()
  })
})
