import { describe, it, expect } from 'vitest'
import { resolveFolder, CURRENT_VERSION } from '@/artifacts/registry'
import registry from '@/artifacts/version-registry.json'

describe('artifacts/registry', () => {
  describe('resolveFolder', () => {
    it('maps a known Officer-generation tag to its folder', () => {
      // `legacy` and `v0.10` both belong to the v1 folder per the registry.
      expect(resolveFolder('legacy')).toBe('v1')
      expect(resolveFolder('v0.10')).toBe('v1')
    })

    it('defaults to the oldest folder when the tag is missing', () => {
      expect(resolveFolder(undefined)).toBe('v1')
      expect(resolveFolder(null)).toBe('v1')
    })

    it('defaults to the oldest folder for an unknown tag (backward-compat safe)', () => {
      expect(resolveFolder('does-not-exist')).toBe('v1')
    })
  })

  it('exposes the current artifact-folder version', () => {
    expect(CURRENT_VERSION).toBe(registry.current)
  })

  it('exposes beacon/impl Ignition module keys for the current folder', () => {
    // Sanity: the current folder carries the module-key maps the backend/app
    // address resolvers depend on. Values are Ignition module keys
    // (`Module#Contract`), not addresses.
    const folder = registry.folders[CURRENT_VERSION as keyof typeof registry.folders]
    expect(folder).toBeDefined()
    expect(folder.beacons.Bank).toContain('#')
    expect(folder.implementations.FeeCollector).toContain('#')
  })
})
