import { describe, it, expect } from 'vitest'
import { resolveFolder, CURRENT_VERSION } from '@/artifacts/registry'
import registry from '@/artifacts/version-registry.json'

describe('artifacts/registry', () => {
  describe('resolveFolder', () => {
    // Oldest folder per resolveFolder's numeric sort (V0 < V0.1 < V1).
    const OLDEST = Object.keys(registry.folders).sort(
      (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''))
    )[0]

    it('falls back to the oldest folder for any tag while per-team resolution is unwired', () => {
      // `officerVersions` are currently empty in the registry (runtime per-team
      // resolution isn't wired yet), so every tag falls back to the oldest folder.
      expect(resolveFolder('legacy')).toBe(OLDEST)
      expect(resolveFolder('v0.10')).toBe(OLDEST)
    })

    it('defaults to the oldest folder when the tag is missing', () => {
      expect(resolveFolder(undefined)).toBe(OLDEST)
      expect(resolveFolder(null)).toBe(OLDEST)
    })

    it('defaults to the oldest folder for an unknown tag (backward-compat safe)', () => {
      expect(resolveFolder('does-not-exist')).toBe(OLDEST)
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
