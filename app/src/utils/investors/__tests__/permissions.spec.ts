import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import type { Team } from '@/types/team'
import {
  buildInvestorPermissionOfficers,
  buildInvestorPermissionRows,
  getGrantableInvestorAddresses,
  getKnownInvestorPermissionAddresses
} from '@/utils/investors/permissions'

const member = '0x1000000000000000000000000000000000000000' as Address
const router = '0x2000000000000000000000000000000000000000' as Address
const currentOfficer = '0x3000000000000000000000000000000000000000' as Address
const previousOfficer = '0x4000000000000000000000000000000000000000' as Address
const external = '0x5000000000000000000000000000000000000000' as Address

const directory: Pick<Team, 'members' | 'teamContracts'> = {
  members: [{ id: '1', name: 'Member', address: member, teamId: 1 }],
  teamContracts: [
    {
      type: 'SafeDepositRouter',
      address: router,
      deployer: member,
      admins: []
    }
  ]
}

describe('Investor permission identities', () => {
  it('normalizes current and previous Officer generations without duplicates', () => {
    const officers = buildInvestorPermissionOfficers({ address: currentOfficer }, [
      { address: currentOfficer.toLowerCase(), isCurrent: false },
      { address: previousOfficer, isCurrent: false },
      { address: 'not-an-address', isCurrent: false }
    ])

    expect(officers).toEqual([
      { address: currentOfficer, isCurrent: true },
      { address: previousOfficer, isCurrent: false }
    ])
  })

  it('[AC-US-SHER-009-01] distinguishes Officer generations from unrelated external accounts', () => {
    const officers = buildInvestorPermissionOfficers({ address: currentOfficer }, [
      { address: previousOfficer, isCurrent: false }
    ])
    const rows = buildInvestorPermissionRows(
      [
        { address: currentOfficer, isOwner: false, isAdmin: true, isMinter: true },
        { address: previousOfficer, isOwner: false, isAdmin: false, isMinter: true },
        { address: external, isOwner: false, isAdmin: false, isMinter: true }
      ],
      directory,
      officers
    )

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: currentOfficer, label: 'Officer', kind: 'contract' }),
        expect.objectContaining({
          address: previousOfficer,
          label: 'Officer (previous)',
          kind: 'contract'
        }),
        expect.objectContaining({
          address: external,
          label: 'External account',
          kind: 'external'
        })
      ])
    )
  })

  it('verifies Officer roles without making Officers grant targets', () => {
    const officers = buildInvestorPermissionOfficers({ address: currentOfficer }, [
      { address: previousOfficer, isCurrent: false }
    ])

    expect(getKnownInvestorPermissionAddresses(directory, officers)).toEqual(
      expect.arrayContaining([member, router, currentOfficer, previousOfficer])
    )
    expect(getGrantableInvestorAddresses(directory)).toEqual(
      new Set([member.toLowerCase(), router.toLowerCase()])
    )
  })
})
