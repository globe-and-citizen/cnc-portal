import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useContractVersion } from '@/composables/contracts/useContractVersion'
import { mockTeamStore } from '@/tests/mocks/store.mock'
import { CURRENT_VERSION } from '@/artifacts/registry'

// The on-chain beacon resolution is isolated in useOfficerBeaconFolder; mock it
// so useContractVersion stays testable as a pure computed. `beaconFolder` drives
// what the (async, cached) beacon read would resolve to.
const beaconFolder = ref<string | undefined>(undefined)
vi.mock('@/composables/contracts/useOfficerBeaconFolder', () => ({
  useOfficerBeaconFolder: () => beaconFolder
}))

// The global store mock (src/tests/setup/store.setup.ts) makes `useTeamStore()`
// return `mockTeamStore`, and resets it before each test. We drive the team
// payload by assigning `currentTeamMeta.data` directly.
type TeamData = typeof mockTeamStore.currentTeamMeta.data
function setTeam(data: Record<string, unknown> | null) {
  mockTeamStore.currentTeamMeta.data = data as unknown as TeamData
}

describe('useContractVersion', () => {
  it('prefers the explicit contractVersion from the team payload', () => {
    beaconFolder.value = 'V0'
    setTeam({ contractVersion: 'V1' })
    // Backend field wins over the on-chain beacon resolution.
    expect(useContractVersion().value).toBe('V1')
  })

  it('falls back to the on-chain beacon-resolved folder when no backend field', () => {
    beaconFolder.value = 'V0.1'
    setTeam({ currentOfficer: { address: '0xofficer' } })
    expect(useContractVersion().value).toBe('V0.1')
  })

  it('defaults to the current version when nothing resolves', () => {
    beaconFolder.value = undefined
    setTeam(null)
    expect(useContractVersion().value).toBe(CURRENT_VERSION)
  })
})
