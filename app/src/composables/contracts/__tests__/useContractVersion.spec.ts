import { describe, it, expect } from 'vitest'
import { useContractVersion } from '@/composables/contracts/useContractVersion'
import { mockTeamStore } from '@/tests/mocks/store.mock'

// The global store mock (src/tests/setup/store.setup.ts) makes `useTeamStore()`
// return `mockTeamStore`, and resets it before each test. We drive the team
// payload by assigning `currentTeamMeta.data` directly.
type TeamData = typeof mockTeamStore.currentTeamMeta.data
function setTeam(data: Record<string, unknown> | null) {
  mockTeamStore.currentTeamMeta.data = data as unknown as TeamData
}

describe('useContractVersion', () => {
  it('prefers the explicit contractVersion from the team payload', () => {
    setTeam({ contractVersion: 'v1' })
    expect(useContractVersion().value).toBe('v1')
  })

  it('derives the folder from the current Officer generation tag', () => {
    setTeam({ currentOfficer: { version: 'v0.10' } })
    expect(useContractVersion().value).toBe('v1')
  })

  it('defaults to the oldest folder when no team data is present', () => {
    setTeam(null)
    expect(useContractVersion().value).toBe('v1')
  })
})
