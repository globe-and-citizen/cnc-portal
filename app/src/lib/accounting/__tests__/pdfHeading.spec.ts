import { describe, it, expect } from 'vitest'
import { documentHeading } from '../pdf'

describe('documentHeading', () => {
  const generatedAt = new Date('2026-11-03T12:00:00Z')

  it('[AC-US-ACCT-004-10] names the team and the activity the books cover', () => {
    const heading = documentHeading(
      { teamName: 'Acme Labs', coverage: 'Activity Dec 21 – Oct 4' },
      generatedAt
    )
    expect(heading.title).toBe('Accounting — Acme Labs')
    expect(heading.subtitle).toMatch(/^Activity Dec 21 – Oct 4 · Generated /)
  })

  it('falls back to the plain title without a team or coverage', () => {
    const heading = documentHeading({}, generatedAt)
    expect(heading.title).toBe('Accounting')
    expect(heading.subtitle).toMatch(/^Generated /)
  })
})
