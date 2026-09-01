import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { validateUtilityBoundaries } from '../check-utility-boundaries.mjs'

describe('utility boundary guard', () => {
  it('accepts explicit, acyclic domain imports', () => {
    const violations = validateUtilityBoundaries(
      new Map([
        ['src/utils/format/address.ts', "export const formatAddress = () => ''"],
        [
          'src/utils/teams/navigation.ts',
          "import { formatAddress } from '@/utils/format/address'\nexport { formatAddress }"
        ],
        ['src/components/TeamCard.vue', "import { formatAddress } from '@/utils/format/address'"]
      ])
    )

    assert.deepEqual(violations, [])
  })

  it('rejects flat utilities, generic names, barrels, runtime dependencies, and browser I/O', () => {
    const violations = validateUtilityBoundaries(
      new Map([
        ['src/utils/generalUtil.ts', "import { useTeamStore } from '@/stores'\nwindow.open('/')"],
        ['src/components/TeamCard.vue', "import { formatAddress } from '@/utils'"]
      ])
    )

    assert.ok(violations.some((violation) => violation.includes('domain directory')))
    assert.ok(violations.some((violation) => violation.includes('*Util')))
    assert.ok(violations.some((violation) => violation.includes('@/stores')))
    assert.ok(violations.some((violation) => violation.includes('browser and HTTP I/O')))
    assert.ok(violations.some((violation) => violation.includes('global @/utils barrel')))
  })

  it('rejects utility import cycles', () => {
    const violations = validateUtilityBoundaries(
      new Map([
        ['src/utils/teams/navigation.ts', "import '../transactions/history'"],
        ['src/utils/transactions/history.ts', "import '@/utils/teams/navigation'"]
      ])
    )

    assert.equal(violations.length, 1)
    assert.match(violations[0] ?? '', /utility import cycle/)
  })
})
