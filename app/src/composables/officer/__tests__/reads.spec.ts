import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOfficerAddress, useOfficerFeeBps } from '../reads'
import { useTeamStore } from '@/stores'
import { useReadContractFn } from '@/tests/mocks'

const defaultOfficerAddress = '0x0987654321098765432109876543210987654321'

function mockTeamMeta(data: unknown) {
  vi.mocked(useTeamStore).mockReturnValueOnce({
    currentTeamMeta: { data }
  } as ReturnType<typeof useTeamStore>)
}

function getReadContractCall(contractType = 'Bank') {
  const result = useOfficerFeeBps(contractType)
  const calls = useReadContractFn.mock.calls
  const config = calls[calls.length - 1]?.[0]

  return { result, config }
}

describe('Officer Composable Reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useOfficerAddress', () => {
    it('returns a computed ref with the officerAddress from the team store', () => {
      expect(useOfficerAddress().value).toBe(defaultOfficerAddress)
    })
  })

  describe('useOfficerFeeBps', () => {
    it.each([
      ['missing', null],
      ['invalid', { currentOfficer: { address: 'not-a-valid-address' } }]
    ])('disables the query when current officer address is %s', (_label, teamData) => {
      mockTeamMeta(teamData)

      const { config } = getReadContractCall()
      expect(config?.query.enabled.value).toBe(false)
    })
  })
})
