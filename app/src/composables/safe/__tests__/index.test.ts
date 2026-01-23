import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('safe index exports', () => {
  let module: typeof import('../index')

  beforeEach(async () => {
    vi.resetModules()
    module = await import('../index')
  })

  it('exports key Safe composables', () => {
    expect(typeof module.useSafeDeployment).toBe('function')
    expect(typeof module.useSafeOwnerManagement).toBe('function')
    expect(typeof module.useSafeExecution).toBe('function')
  })

  it('exports Safe URL utilities', () => {
    expect(typeof module.getSafeHomeUrl).toBe('function')
    expect(typeof module.getSafeSettingsUrl).toBe('function')
    expect(typeof module.openSafeAppUrl).toBe('function')
  })
})
